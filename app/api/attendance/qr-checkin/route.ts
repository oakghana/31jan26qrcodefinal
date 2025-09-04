import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { location_id, qr_timestamp, device_info } = body

    // Verify location exists
    const { data: location, error: locationError } = await supabase
      .from("geofence_locations")
      .select("*")
      .eq("id", location_id)
      .eq("is_active", true)
      .single()

    if (locationError || !location) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 })
    }

    // Check if user already checked in today
    const today = new Date().toISOString().split("T")[0]
    const { data: existingAttendance } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .single()

    if (existingAttendance) {
      return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
    }

    // Create attendance record
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance_records")
      .insert([
        {
          user_id: user.id,
          location_id: location.id,
          check_in_time: new Date().toISOString(),
          status: "present",
          qr_code_used: true,
          qr_timestamp: new Date(qr_timestamp).toISOString(),
        },
      ])
      .select()
      .single()

    if (attendanceError) {
      return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 })
    }

    // Create device session
    await supabase.from("device_sessions").insert([
      {
        user_id: user.id,
        attendance_record_id: attendance.id,
        device_info: device_info || {},
        session_start: new Date().toISOString(),
      },
    ])

    return NextResponse.json({
      success: true,
      message: "Successfully checked in with QR code",
      attendance,
    })
  } catch (error) {
    console.error("QR check-in error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
