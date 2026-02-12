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

    // Check if user already checked in today IMMEDIATELY at the start
    const today = new Date().toISOString().split("T")[0]
    const { data: existingRecord, error: checkError } = await supabase
      .from("attendance_records")
      .select("id, check_in_time, check_out_time, work_hours")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .maybeSingle()

    if (checkError) {
      console.error("[v0] Error checking existing attendance:", checkError)
    }

    let deviceSharingWarning = null

    if (existingRecord && existingRecord.check_in_time) {
      console.log("[v0] DUPLICATE CHECK-IN BLOCKED - User already checked in today")

      // Log security violation
      const body = await request.json()
      if (body.device_info?.device_id) {
        const ipAddress = request.ip || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null

        await supabase
          .from("device_security_violations")
          .insert({
            device_id: body.device_info.device_id,
            ip_address: ipAddress,
            attempted_user_id: user.id,
            bound_user_id: user.id,
            violation_type: "double_checkin_attempt",
            device_info: body.device_info,
          })
          .catch((err) => {
            console.log("[v0] Could not log security violation (table may not exist):", err.message)
          })
      }

      const checkInTime = new Date(existingRecord.check_in_time).toLocaleTimeString()

      if (existingRecord.check_out_time) {
        const checkOutTime = new Date(existingRecord.check_out_time).toLocaleTimeString()
        const workHours = existingRecord.work_hours || 0
        
        return NextResponse.json(
          {
            alreadyCompleted: true,
            error: `You have already completed your work for today! You checked in at ${checkInTime} and checked out at ${checkOutTime} (${workHours} hours worked). Great job! See you tomorrow.`,
            details: {
              checkInTime: checkInTime,
              checkOutTime: checkOutTime,
              workHours: workHours,
              message: "Your attendance for today is complete. No further action needed."
            }
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

    const body = await request.json()
    const { latitude, longitude, location_id, device_info, qr_code_used, qr_timestamp } = body

    // Parallelize independent queries: user profile, leave status, yesterday's record, location
    const [userProfileResult, leaveStatusResult, yesterdayRecordResult, locationResult] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("first_name, last_name, assigned_location_id, department_id, departments(code, name)")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("leave_status")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "on_leave")
        .gte("end_date", today)
        .lte("start_date", today)
        .maybeSingle(),
      supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", user.id)
        .gte("check_in_time", `${new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0]}T00:00:00`)
        .lt("check_in_time", `${new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0]}T23:59:59`)
        .maybeSingle(),
      location_id ? supabase
        .from("geofence_locations")
        .select("name, address, district_id")
        .eq("id", location_id)
        .single() : Promise.resolve({ data: null, error: null }),
    ])

    const { data: userProfile } = userProfileResult
    const { data: leaveStatus } = leaveStatusResult
    const { data: yesterdayRecord } = yesterdayRecordResult
    const { data: locationData, error: locationError } = locationResult

    // Security and Research departments have rotating shifts - exempt from time restrictions
    const departmentCode = (userProfile?.departments as any)?.code
    const isShiftDepartment = departmentCode === 'SEC' || departmentCode === 'RES'

    // Check leave status
    if (leaveStatus) {
      return NextResponse.json(
        {
          error: `You are currently on approved leave from ${new Date(leaveStatus.start_date).toLocaleDateString()} to ${new Date(leaveStatus.end_date).toLocaleDateString()}. You cannot check in during this period. Please contact your manager if you believe this is incorrect.`,
          onLeave: true,
        },
        { status: 403 }
      )
    }

    if (locationError) {
      console.error("Location lookup error:", locationError)
    }

    // Device sharing detection with optimized queries
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
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      
      // Parallelize device and IP checks
      const [deviceSessionResult, ipSessionResult] = await Promise.all([
        supabase
          .from("device_sessions")
          .select("user_id, last_activity, ip_address, device_id")
          .eq("device_id", device_info.device_id)
          .neq("user_id", user.id)
          .gte("last_activity", twoHoursAgo)
          .order("last_activity", { ascending: false })
          .limit(1)
          .maybeSingle(),
        ipAddress ? supabase
          .from("device_sessions")
          .select("user_id, last_activity, ip_address, device_id")
          .eq("ip_address", ipAddress)
          .neq("user_id", user.id)
          .neq("device_id", device_info.device_id)
          .gte("last_activity", twoHoursAgo)
          .order("last_activity", { ascending: false })
          .limit(1)
          .maybeSingle() : Promise.resolve({ data: null, error: null }),
      ])

      const recentDeviceSession = deviceSessionResult.data
      const ipSharingSession = ipSessionResult.data
    }

    // Get yesterday's record to check for missed check-out (already fetched in Promise.all above)
    let missedCheckoutWarning = null
    if (yesterdayRecord && yesterdayRecord.check_in_time && !yesterdayRecord.check_out_time) {
      // Auto check-out the previous day at 11:59 PM
      const yesterdayDate = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split("T")[0]
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

    // Get district name separately if needed (using already-fetched locationData from Promise.all)
    let districtName = null
    if (locationData?.district_id) {
      const { data: district } = await supabase
        .from("districts")
        .select("name")
        .eq("id", locationData.district_id)
        .maybeSingle()
      districtName = district?.name
    }

    // Calculate check-in position for the location today
    let checkInPosition = null
    if (attendanceRecord && location_id) {
      const { count } = await supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("check_in_location_id", location_id)
        .gte("check_in_time", `${today}T00:00:00`)
        .lte("check_in_time", attendanceRecord.check_in_time)

      checkInPosition = count || 1
    }

    if (attendanceError) {
      console.error("Attendance error:", attendanceError)

      // Check if error is due to unique constraint violation
      if (attendanceError.code === "23505" || attendanceError.message?.includes("idx_unique_daily_checkin")) {
        console.log("[v0] RACE CONDITION CAUGHT - Unique constraint prevented duplicate check-in")
        return NextResponse.json(
          {
            error:
              "DUPLICATE CHECK-IN BLOCKED: You have already checked in today. This was a race condition that was prevented by the system. Please refresh your page.",
          },
          { status: 400 },
        )
      }

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

    // Prepare response with late arrival warning if applicable
    let checkInMessage = attendanceData.is_remote_location
      ? `Successfully checked in at ${locationData?.name} (different from your assigned location). Remember to check out at the end of your work today.`
      : `Successfully checked in at ${locationData?.name}. Remember to check out at the end of your work today.`
    
    if (isLateArrival) {
      const arrivalTime = `${checkInHour}:${checkInMinutes.toString().padStart(2, '0')}`
      checkInMessage = `Late arrival detected - You checked in at ${arrivalTime} (after 9:00 AM). ${checkInMessage}`
    }

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
        message: checkInMessage,
        checkInPosition,
        isLateArrival,
        lateArrivalTime: isLateArrival ? checkInTime.toLocaleTimeString() : null,
        missedCheckoutWarning,
        deviceSharingWarning,
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
