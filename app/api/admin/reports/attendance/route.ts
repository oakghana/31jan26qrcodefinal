import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user and check admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin or department_head role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin", "department_head"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const startDate =
      searchParams.get("start_date") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const endDate = searchParams.get("end_date") || new Date().toISOString().split("T")[0]
    const departmentId = searchParams.get("department_id")
    const userId = searchParams.get("user_id")

    let query = supabase
      .from("attendance_records")
      .select(`
        *,
        user_profiles!inner (
          id,
          first_name,
          last_name,
          employee_id,
          department_id,
          departments (
            name,
            code
          )
        ),
        geofence_locations!check_in_location_id (
          name,
          address
        )
      `)
      .gte("check_in_time", `${startDate}T00:00:00`)
      .lte("check_in_time", `${endDate}T23:59:59`)

    // If department head, only show their department's data
    if (profile.role === "department_head" && profile.department_id) {
      query = query.eq("user_profiles.department_id", profile.department_id)
    }

    // Apply additional filters
    if (departmentId) {
      query = query.eq("user_profiles.department_id", departmentId)
    }

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data: attendanceRecords, error } = await query.order("check_in_time", { ascending: false })

    if (error) {
      console.error("Attendance report error:", error)
      return NextResponse.json({ error: "Failed to fetch attendance report" }, { status: 500 })
    }

    // Calculate summary statistics
    const totalRecords = attendanceRecords.length
    const totalWorkHours = attendanceRecords.reduce((sum, record) => sum + (record.work_hours || 0), 0)
    const averageWorkHours = totalRecords > 0 ? totalWorkHours / totalRecords : 0

    // Group by status
    const statusCounts = attendanceRecords.reduce(
      (acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Group by department
    const departmentStats = attendanceRecords.reduce(
      (acc, record) => {
        const deptName = record.user_profiles?.departments?.name || "Unknown"
        if (!acc[deptName]) {
          acc[deptName] = { count: 0, totalHours: 0 }
        }
        acc[deptName].count += 1
        acc[deptName].totalHours += record.work_hours || 0
        return acc
      },
      {} as Record<string, { count: number; totalHours: number }>,
    )

    return NextResponse.json({
      success: true,
      data: {
        records: attendanceRecords,
        summary: {
          totalRecords,
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          averageWorkHours: Math.round(averageWorkHours * 100) / 100,
          statusCounts,
          departmentStats,
        },
      },
    })
  } catch (error) {
    console.error("Attendance report API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
