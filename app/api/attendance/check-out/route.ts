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
    const { latitude, longitude, location_id } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Location coordinates are required" }, { status: 400 })
    }

    // Find today's attendance record
    const today = new Date().toISOString().split("T")[0]
    const { data: attendanceRecord, error: findError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .single()

    if (findError || !attendanceRecord) {
      return NextResponse.json({ error: "No check-in record found for today" }, { status: 400 })
    }

    if (attendanceRecord.check_out_time) {
      return NextResponse.json({ error: "Already checked out today" }, { status: 400 })
    }

    // Calculate work hours
    const checkInTime = new Date(attendanceRecord.check_in_time)
    const checkOutTime = new Date()
    const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

    // Update attendance record
    const { data: updatedRecord, error: updateError } = await supabase
      .from("attendance_records")
      .update({
        check_out_time: checkOutTime.toISOString(),
        check_out_location_id: location_id,
        check_out_latitude: latitude,
        check_out_longitude: longitude,
        work_hours: Math.round(workHours * 100) / 100, // Round to 2 decimal places
        updated_at: new Date().toISOString(),
      })
      .eq("id", attendanceRecord.id)
      .select("*")
      .single()

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json({ error: "Failed to record check-out" }, { status: 500 })
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "check_out",
      table_name: "attendance_records",
      record_id: attendanceRecord.id,
      old_values: attendanceRecord,
      new_values: updatedRecord,
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: "Successfully checked out",
    })
  } catch (error) {
    console.error("Check-out error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
