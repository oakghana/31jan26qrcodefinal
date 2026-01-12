import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("leave_status, leave_start_date, leave_end_date, first_name, assigned_location_id")
      .eq("id", user.id)
      .maybeSingle()

    if (userProfile && userProfile.leave_status && userProfile.leave_status !== "active") {
      const leaveType = userProfile.leave_status === "on_leave" ? "on leave" : "on sick leave"
      const endDate = userProfile.leave_end_date
        ? new Date(userProfile.leave_end_date).toLocaleDateString()
        : "unspecified"

      return NextResponse.json(
        {
          error: `You are currently marked as ${leaveType} until ${endDate}. You cannot check in during your leave period. Please update your leave status when you resume work.`,
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { latitude, longitude, location_id, device_info, qr_code_used, qr_timestamp } = body

    if (device_info?.device_id) {
      const getValidIpAddress = () => {
        const possibleIps = [
          request.ip,
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
          request.headers.get("x-real-ip"),
        ]
        for (const ip of possibleIps) {
          if (ip && ip !== "unknown" && ip !== "::1" && ip !== "127.0.0.1") {
            return ip
          }
        }
        return null
      }

      const ipAddress = getValidIpAddress()

      // Check if device is bound to a different user
      const { data: existingBinding, error: bindingError } = await supabase
        .from("device_user_bindings")
        .select("user_id")
        .eq("device_id", device_info.device_id)
        .eq("is_active", true)
        .maybeSingle()

      if (bindingError) {
        if (bindingError.code === "PGRST205" || bindingError.message?.includes("Could not find the table")) {
          console.log("[v0] Device binding tables not created yet, skipping device security check")
          // Continue with check-in
        } else {
          console.error("[v0] Error checking device binding:", bindingError)
          // Continue with check-in on other errors too
        }
      } else if (existingBinding && existingBinding.user_id !== user.id) {
        // Log violation only if tables exist
        await supabase.from("device_security_violations").insert({
          device_id: device_info.device_id,
          ip_address: ipAddress,
          attempted_user_id: user.id,
          bound_user_id: existingBinding.user_id,
          violation_type: "checkin_attempt",
          device_info: device_info,
        })

        return NextResponse.json(
          {
            error:
              "This device is registered to another staff member. You cannot check in from this device. Your supervisor has been notified.",
          },
          { status: 403 },
        )
      }

      if (ipAddress) {
        const today = new Date().toISOString().split("T")[0]
        const { data: ipCheckIns, error: ipError } = await supabase
          .from("attendance_records")
          .select("user_id, check_in_time")
          .gte("check_in_time", `${today}T00:00:00`)
          .lt("check_in_time", `${today}T23:59:59`)
          .not("user_id", "eq", user.id)

        if (!ipError && ipCheckIns && ipCheckIns.length > 0) {
          // Check if any check-ins came from this IP
          const { data: deviceSessions } = await supabase
            .from("device_sessions")
            .select("user_id")
            .eq("ip_address", ipAddress)
            .in(
              "user_id",
              ipCheckIns.map((r) => r.user_id),
            )
            .gte("last_activity", `${today}T00:00:00`)

          if (deviceSessions && deviceSessions.length > 0) {
            // Log as security violation
            await supabase.from("device_security_violations").insert({
              device_id: device_info.device_id,
              ip_address: ipAddress,
              attempted_user_id: user.id,
              bound_user_id: deviceSessions[0].user_id,
              violation_type: "duplicate_ip_checkin",
              device_info: device_info,
            })

            return NextResponse.json(
              {
                error:
                  "SECURITY VIOLATION: Another staff member has already checked in from this IP address today. Device sharing is not permitted. Your department head has been notified.",
              },
              { status: 403 },
            )
          }
        }
      }
    }

    if (!qr_code_used && (!latitude || !longitude)) {
      return NextResponse.json({ error: "Location coordinates are required for GPS check-in" }, { status: 400 })
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = yesterday.toISOString().split("T")[0]

    const { data: yesterdayRecord } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", `${yesterdayDate}T00:00:00`)
      .lt("check_in_time", `${yesterdayDate}T23:59:59`)
      .maybeSingle()

    let missedCheckoutWarning = null
    if (yesterdayRecord && yesterdayRecord.check_in_time && !yesterdayRecord.check_out_time) {
      // Auto check-out the previous day at 11:59 PM
      const autoCheckoutTime = new Date(`${yesterdayDate}T23:59:59`)
      const checkInTime = new Date(yesterdayRecord.check_in_time)
      const workHours = (autoCheckoutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

      await supabase
        .from("attendance_records")
        .update({
          check_out_time: autoCheckoutTime.toISOString(),
          work_hours: Math.round(workHours * 100) / 100,
          check_out_method: "auto_system",
          check_out_location_name: "Auto Check-out (Missed)",
          missed_checkout: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", yesterdayRecord.id)

      // Create audit log for missed check-out
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "auto_checkout_missed",
        table_name: "attendance_records",
        record_id: yesterdayRecord.id,
        new_values: {
          reason: "Missed check-out from previous day",
          auto_checkout_time: autoCheckoutTime.toISOString(),
          work_hours_calculated: workHours,
        },
        ip_address: request.ip || null,
        user_agent: request.headers.get("user-agent"),
      })

      missedCheckoutWarning = {
        date: yesterdayDate,
        message: "You did not check out yesterday. This has been recorded and will be visible to your department head.",
      }
    }

    // Check if user already checked in today
    const today = new Date().toISOString().split("T")[0]
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("check_in_time, check_out_time")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .maybeSingle()

    if (existingRecord && existingRecord.check_in_time) {
      if (device_info?.device_id) {
        const ipAddress = request.ip || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null

        await supabase.from("device_security_violations").insert({
          device_id: device_info.device_id,
          ip_address: ipAddress,
          attempted_user_id: user.id,
          bound_user_id: user.id,
          violation_type: "double_checkin_attempt",
          device_info: device_info,
        })
      }

      const checkInTime = new Date(existingRecord.check_in_time).toLocaleTimeString()

      if (existingRecord.check_out_time) {
        return NextResponse.json(
          {
            error: `DUPLICATE CHECK-IN BLOCKED: You have already completed your attendance for today. You checked in at ${checkInTime} and checked out at ${new Date(existingRecord.check_out_time).toLocaleTimeString()}. This attempt has been logged as a security violation.`,
          },
          { status: 400 },
        )
      } else {
        return NextResponse.json(
          {
            error: `DUPLICATE CHECK-IN BLOCKED: You have already checked in today at ${checkInTime}. You are currently on duty. Please check out when you finish your work. This attempt has been logged.`,
          },
          { status: 400 },
        )
      }
    }

    const { data: locationData, error: locationError } = await supabase
      .from("geofence_locations")
      .select("name, address, district_id")
      .eq("id", location_id)
      .single()

    if (locationError) {
      console.error("Location lookup error:", locationError)
    }

    // Get district name separately if needed
    let districtName = null
    if (locationData?.district_id) {
      const { data: district } = await supabase
        .from("districts")
        .select("name")
        .eq("id", locationData.district_id)
        .maybeSingle()
      districtName = district?.name
    }

    let deviceSessionId = null
    if (device_info?.device_id) {
      // First try to find existing session
      const { data: existingSession } = await supabase
        .from("device_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("device_id", device_info.device_id)
        .maybeSingle()

      if (existingSession) {
        // Update existing session
        const { data: updatedSession } = await supabase
          .from("device_sessions")
          .update({
            device_name: device_info.device_name || null,
            device_type: device_info.device_type || null,
            browser_info: device_info.browser_info || null,
            ip_address: request.ip || null,
            is_active: true,
            last_activity: new Date().toISOString(),
          })
          .eq("id", existingSession.id)
          .select("id")
          .maybeSingle()

        if (updatedSession) {
          deviceSessionId = updatedSession.id
        }
      } else {
        // Create new session only if we have a valid device_id
        const { data: newSession, error: sessionError } = await supabase
          .from("device_sessions")
          .insert({
            user_id: user.id,
            device_id: device_info.device_id,
            device_name: device_info.device_name || null,
            device_type: device_info.device_type || null,
            browser_info: device_info.browser_info || null,
            ip_address: request.ip || null,
            is_active: true,
            last_activity: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle()

        if (sessionError) {
          console.error("[v0] Device session creation error:", sessionError)
          // Continue without device session - it's optional
        } else if (newSession) {
          deviceSessionId = newSession.id
        }
      }
    }

    const attendanceData = {
      user_id: user.id,
      check_in_time: new Date().toISOString(),
      check_in_location_id: location_id,
      device_session_id: deviceSessionId,
      status: "present",
      check_in_method: qr_code_used ? "qr_code" : "gps",
      check_in_location_name: locationData?.name || null,
      is_remote_location: false, // Will be calculated based on user's assigned location
    }

    // Add GPS coordinates only if available
    if (latitude && longitude) {
      attendanceData.check_in_latitude = latitude
      attendanceData.check_in_longitude = longitude
    }

    // Add QR code timestamp if used
    if (qr_code_used && qr_timestamp) {
      attendanceData.qr_check_in_timestamp = qr_timestamp
    }

    if (userProfile?.assigned_location_id && userProfile.assigned_location_id !== location_id) {
      attendanceData.is_remote_location = true
    }

    const { data: attendanceRecord, error: attendanceError } = await supabase
      .from("attendance_records")
      .insert(attendanceData)
      .select("*")
      .single()

    if (attendanceError) {
      console.error("Attendance error:", attendanceError)
      return NextResponse.json(
        { error: "Failed to record attendance" },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "check_in",
      table_name: "attendance_records",
      record_id: attendanceRecord.id,
      new_values: {
        ...attendanceRecord,
        location_name: locationData?.name,
        district_name: districtName,
        check_in_method: attendanceData.check_in_method,
        is_remote_location: attendanceData.is_remote_location,
      },
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          ...attendanceRecord,
          location_tracking: {
            location_name: locationData?.name,
            district_name: districtName,
            is_remote_location: attendanceData.is_remote_location,
            check_in_method: attendanceData.check_in_method,
          },
        },
        message: attendanceData.is_remote_location
          ? `Successfully checked in at ${locationData?.name} (different from your assigned location). Remember to check out at the end of your work today.`
          : `Successfully checked in at ${locationData?.name}. Remember to check out at the end of your work today.`,
        missedCheckoutWarning,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate, private",
          Pragma: "no-cache",
          Expires: "0",
          "X-Content-Type-Options": "nosniff",
        },
      },
    )
  } catch (error) {
    console.error("Check-in error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  }
}
