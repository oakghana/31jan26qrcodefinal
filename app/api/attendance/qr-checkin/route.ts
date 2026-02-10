import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculateDistance } from "@/lib/location-utils"

export async function POST(request: Request) {
  try {
    console.log("[v0] QR check-in API called")

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] No authenticated user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    console.log("[v0] QR check-in request body:", body)

    const { location_id, qr_timestamp, device_info, userLatitude, userLongitude } = body

    if (!location_id) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 })
    }

    const { data: location, error: locationError } = await supabase
      .from("geofence_locations")
      .select("*")
      .eq("id", location_id)
      .eq("is_active", true)
      .maybeSingle()

    if (locationError || !location) {
      console.log("[v0] Location not found or inactive:", locationError)
      return NextResponse.json({ error: "Invalid or inactive location" }, { status: 400 })
    }

    let distance = 0
    let proximityVerified = false
    let gpsAvailable = false

    // Fetch device-specific radius settings from database (same as check-out)
    const { data: deviceRadiusSettings } = await supabase
      .from("device_radius_settings")
      .select("device_type, check_in_radius_meters")
      .eq("is_active", true)

    // Determine device type from device_info sent by client
    const deviceType = device_info?.device_type || "desktop"
    let maxCheckInRadius = 1000 // Default fallback
    if (deviceRadiusSettings && deviceRadiusSettings.length > 0) {
      const setting = deviceRadiusSettings.find((s: any) => s.device_type === deviceType)
      if (setting) {
        maxCheckInRadius = setting.check_in_radius_meters
      }
    }

    console.log("[v0] QR check-in device radius:", { deviceType, maxCheckInRadius })

    if (userLatitude !== undefined && userLongitude !== undefined) {
      gpsAvailable = true
      distance = calculateDistance(userLatitude, userLongitude, location.latitude, location.longitude)

      console.log("[v0] QR scan with GPS - distance from location:", Math.round(distance), "meters")
      console.log("[v0] Device radius limit:", maxCheckInRadius, "meters")

      if (distance > maxCheckInRadius) {
        console.log("[v0] User too far from location for QR check-in:", Math.round(distance), "meters")

        // Log as potential abuse attempt
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          action: "qr_checkin_out_of_range",
          table_name: "attendance_records",
          record_id: location_id,
          new_values: {
            distance: Math.round(distance),
            maxRadius: maxCheckInRadius,
            deviceType,
            location: location.name,
            userLatitude,
            userLongitude,
            timestamp: new Date().toISOString(),
          },
        }).catch(() => {})

        return NextResponse.json(
          {
            error: "Too far from location",
            message: `You are ${Math.round(distance).toLocaleString()} meters from ${location.name}. QR code check-in requires being within ${maxCheckInRadius} meters of the location.`,
            distance: Math.round(distance),
            locationName: location.name,
          },
          { status: 403 },
        )
      }

      proximityVerified = true
      console.log("[v0] GPS proximity verified - within", maxCheckInRadius, "m of:", location.name)
    } else {
      console.log("[v0] QR check-in WITHOUT GPS (device GPS unavailable or manual entry)")
      distance = 0
      proximityVerified = false
      gpsAvailable = false
    }

    const now = new Date()
    const today = now.toISOString().split("T")[0]

    const { data: existingAttendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00Z`)
      .lt("check_in_time", `${today}T23:59:59Z`)
      .maybeSingle()

    if (attendanceError) {
      console.error("[v0] Error checking existing attendance:", attendanceError)
    }

    let missedCheckoutWarning = null

    if (existingAttendance && !existingAttendance.check_out_time) {
      const checkInDate = new Date(existingAttendance.check_in_time).toISOString().split("T")[0]

      if (checkInDate !== today) {
        console.log("[v0] Found unclosed attendance from previous day, auto-closing...")

        const previousDayEnd = new Date(`${checkInDate}T23:59:59Z`)
        const checkInTime = new Date(existingAttendance.check_in_time)
        const workHours = (previousDayEnd.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

        await supabase
          .from("attendance_records")
          .update({
            check_out_time: previousDayEnd.toISOString(),
            work_hours: workHours,
            auto_checkout: true,
            notes: "Auto checked out at 11:59 PM (missed checkout)",
          })
          .eq("id", existingAttendance.id)

        missedCheckoutWarning = {
          message:
            "You did not check out yesterday. Your previous day's attendance has been automatically closed at 11:59 PM.",
          previousDate: checkInDate,
          autoCheckoutTime: previousDayEnd.toISOString(),
        }

        console.log("[v0] Previous day auto-closed successfully")
      } else {
        return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
      }
    } else if (existingAttendance && existingAttendance.check_out_time) {
      return NextResponse.json({ error: "Already completed attendance for today" }, { status: 400 })
    }

    const { data: attendance, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        user_id: user.id,
        check_in_location_id: location.id,
        check_in_location_name: location.name,
        check_in_time: now.toISOString(),
        check_in_method: "qr_code",
        check_in_latitude: userLatitude || location.latitude,
        check_in_longitude: userLongitude || location.longitude,
        status: "present",
        notes: gpsAvailable
          ? `QR code scanned - ${Math.round(distance)}m from location (GPS verified within ${maxCheckInRadius}m device radius)`
          : `QR code scanned - GPS unavailable, location verified by QR code only (manual entry or GPS disabled)`,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Failed to create attendance record:", insertError)
      return NextResponse.json({ error: "Failed to record attendance", details: insertError.message }, { status: 500 })
    }

    console.log("[v0] Attendance record created via QR code (within tolerance):", attendance.id)

    if (device_info) {
      await supabase.from("device_sessions").insert({
        user_id: user.id,
        attendance_record_id: attendance.id,
        device_info: device_info,
        session_start: now.toISOString(),
      })
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "qr_check_in",
      table_name: "attendance_records",
      record_id: attendance.id,
      new_values: {
        location: location.name,
        check_in_method: "qr_code",
        timestamp: now.toISOString(),
        distance_meters: Math.round(distance),
      },
    })

    console.log("[v0] QR check-in completed successfully:", gpsAvailable ? "GPS verified" : "No GPS verification")

    return NextResponse.json({
      success: true,
      message: `Successfully checked in at ${location.name} using QR code${gpsAvailable ? " (GPS verified)" : " (manual entry)"}`,
      data: {
        attendance,
        location_tracking: {
          location_name: location.name,
          check_in_method: "qr_code",
          distance_meters: Math.round(distance),
          proximity_verified: proximityVerified,
          gps_available: gpsAvailable,
        },
      },
      missedCheckoutWarning,
    })
  } catch (error) {
    console.error("[v0] QR check-in error:", error)

    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during check-in"

    return NextResponse.json(
      {
        error: "Internal server error",
        message: errorMessage,
        details: "Please try again or contact support if the problem persists",
      },
      { status: 500 },
    )
  }
}
