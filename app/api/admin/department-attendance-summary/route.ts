import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get("departmentId")

    if (!departmentId) {
      return NextResponse.json({ error: "Department ID is required" }, { status: 400 })
    }

    // Check user is department head or admin
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

    // Department heads can only see their own department
    if (profile.role === "department_head" && profile.department_id !== departmentId) {
      return NextResponse.json({ error: "Can only view your own department" }, { status: 403 })
    }

    const today = new Date().toISOString().split("T")[0]

    // Get all staff in the department
    const { data: allStaff, error: staffError } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, employee_id, position")
      .eq("department_id", departmentId)
      .eq("is_active", true)
      .neq("role", "admin")
      .neq("role", "it-admin")

    if (staffError) throw staffError

    // Get today's attendance records for the department
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("*")
      .in(
        "user_id",
        allStaff.map((s) => s.id),
      )
      .gte("check_in_time", `${today}T00:00:00`)
      .lte("check_in_time", `${today}T23:59:59`)

    if (attendanceError) throw attendanceError

    // Categorize staff
    const earlyCheckIns: any[] = []
    const noCheckIns: any[] = []
    const earlyCheckouts: any[] = []
    const noCheckouts: any[] = []

    const workStartTime = new Date(`${today}T08:00:00`)
    const workEndTime = new Date(`${today}T17:00:00`)

    allStaff.forEach((staff) => {
      const attendance = attendanceRecords?.find((a) => a.user_id === staff.id)

      if (!attendance) {
        // No check-in at all
        noCheckIns.push({
          ...staff,
          status: "no_checkin",
          check_in_time: null,
          check_out_time: null,
        })
      } else {
        const checkInTime = new Date(attendance.check_in_time)

        // Early check-in (before 8 AM)
        if (checkInTime < workStartTime) {
          earlyCheckIns.push({
            ...staff,
            status: "early_checkin",
            check_in_time: attendance.check_in_time,
            check_out_time: attendance.check_out_time,
            attendance_record_id: attendance.id,
          })
        }

        // Check-out issues
        if (!attendance.check_out_time) {
          noCheckouts.push({
            ...staff,
            status: "no_checkout",
            check_in_time: attendance.check_in_time,
            check_out_time: null,
            attendance_record_id: attendance.id,
          })
        } else {
          const checkOutTime = new Date(attendance.check_out_time)
          if (checkOutTime < workEndTime) {
            earlyCheckouts.push({
              ...staff,
              status: "early_checkout",
              check_in_time: attendance.check_in_time,
              check_out_time: attendance.check_out_time,
              attendance_record_id: attendance.id,
            })
          }
        }
      }
    })

    return NextResponse.json({
      earlyCheckIns,
      noCheckIns,
      earlyCheckouts,
      noCheckouts,
      totalStaff: allStaff.length,
      presentStaff: attendanceRecords?.length || 0,
      absentStaff: noCheckIns.length,
    })
  } catch (error) {
    console.error("Error fetching department attendance summary:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
