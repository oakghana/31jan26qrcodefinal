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

    const body = await request.json()
    const { latitude, longitude, location_id, device_info } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Location coordinates are required" }, { status: 400 })
    }

    // Check if user already checked in today
    const today = new Date().toISOString().split("T")[0]
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .single()

    if (existingRecord && existingRecord.check_in_time) {
      return NextResponse.json({ error: "Already checked in today" }, { status: 400 })
    }

    // Create or update device session
    let deviceSessionId = null
    if (device_info) {
      const { data: deviceSession, error: deviceError } = await supabase
        .from("device_sessions")
        .upsert(
          {
            user_id: user.id,
            device_id: device_info.device_id,
            device_name: device_info.device_name,
            device_type: device_info.device_type,
            browser_info: device_info.browser_info,
            ip_address: request.ip || null,
            is_active: true,
            last_activity: new Date().toISOString(),
          },
          { onConflict: "user_id,device_id" },
        )
        .select("id")
        .single()

      if (!deviceError && deviceSession) {
        deviceSessionId = deviceSession.id
      }
    }

    // Create attendance record
    const { data: attendanceRecord, error: attendanceError } = await supabase
      .from("attendance_records")
      .insert({
        user_id: user.id,
        check_in_time: new Date().toISOString(),
        check_in_location_id: location_id,
        check_in_latitude: latitude,
        check_in_longitude: longitude,
        device_session_id: deviceSessionId,
        status: "present",
      })
      .select("*")
      .single()

    if (attendanceError) {
      console.error("Attendance error:", attendanceError)
      return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 })
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "check_in",
      table_name: "attendance_records",
      record_id: attendanceRecord.id,
      new_values: attendanceRecord,
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      data: attendanceRecord,
      message: "Successfully checked in",
    })
  } catch (error) {
    console.error("Check-in error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
