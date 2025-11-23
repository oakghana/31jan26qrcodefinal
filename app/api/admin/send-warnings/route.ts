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

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin", "department_head", "it-admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { staffIds, message, departmentId } = body

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return NextResponse.json({ error: "Staff IDs are required" }, { status: 400 })
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Warning message is required" }, { status: 400 })
    }

    const today = new Date().toISOString().split("T")[0]

    // Create warnings for each selected staff
    const warnings = staffIds.map((staffId) => ({
      issued_by: user.id,
      issued_to: staffId,
      warning_type: "no_checkin", // You can make this dynamic based on the tab
      warning_message: message,
      attendance_date: today,
      department_id: departmentId,
      is_read: false,
    }))

    const { data, error } = await supabase.from("staff_warnings").insert(warnings).select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      count: data.length,
      message: "Warnings sent successfully",
    })
  } catch (error) {
    console.error("Error sending warnings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
