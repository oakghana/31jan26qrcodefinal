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
    const { format, startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
    }

    const { data: attendanceRecords, error: fetchError } = await supabase
      .from("attendance_records")
      .select(`
        id,
        check_in_time,
        check_out_time,
        work_hours,
        status,
        check_in_method,
        check_out_method,
        check_in_location_name,
        check_out_location_name,
        is_remote_location,
        different_checkout_location,
        geofence_locations!check_in_location_id (
          name,
          address,
          districts (
            name
          )
        ),
        checkout_location:geofence_locations!check_out_location_id (
          name,
          address,
          districts (
            name
          )
        )
      `)
      .eq("user_id", user.id)
      .gte("check_in_time", `${startDate}T00:00:00`)
      .lte("check_in_time", `${endDate}T23:59:59`)
      .order("check_in_time", { ascending: false })

    if (fetchError) {
      console.error("Failed to fetch personal attendance:", fetchError)
      return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
    }

    // Get user profile for export header
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select(`
        first_name,
        last_name,
        employee_id,
        departments (
          name
        )
      `)
      .eq("id", user.id)
      .single()

    if (format === "csv") {
      const csvContent = [
        [
          "Date",
          "Day of Week",
          "Check In Time",
          "Check In Location",
          "Check In Method",
          "Check Out Time",
          "Check Out Location",
          "Check Out Method",
          "Work Hours",
          "Status",
          "Remote Location",
          "Different Checkout Location",
          "Notes",
        ].join(","),
        ...attendanceRecords.map((record) => {
          const checkInDate = new Date(record.check_in_time)
          const dayOfWeek = checkInDate.toLocaleDateString("en-US", { weekday: "long" })

          const notes = []
          if (record.is_remote_location) {
            notes.push("Checked in at non-assigned location")
          }
          if (record.different_checkout_location) {
            notes.push("Checked out at different location")
          }

          return [
            checkInDate.toLocaleDateString(),
            `"${dayOfWeek}"`,
            checkInDate.toLocaleTimeString(),
            `"${record.check_in_location_name || record.geofence_locations?.name || "N/A"}"`,
            `"${record.check_in_method || "gps"}"`,
            record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : "N/A",
            `"${record.check_out_location_name || record.checkout_location?.name || "N/A"}"`,
            `"${record.check_out_method || "gps"}"`,
            record.work_hours?.toFixed(2) || "0",
            `"${record.status}"`,
            record.is_remote_location ? "Yes" : "No",
            record.different_checkout_location ? "Yes" : "No",
            `"${notes.join("; ")}"`,
          ].join(",")
        }),
      ].join("\n")

      // Add header with user info
      const headerInfo = [
        `# Personal Attendance Report`,
        `# Employee: ${userProfile?.first_name} ${userProfile?.last_name}`,
        `# Employee ID: ${userProfile?.employee_id}`,
        `# Department: ${userProfile?.departments?.name || "N/A"}`,
        `# Period: ${startDate} to ${endDate}`,
        `# Generated: ${new Date().toLocaleString()}`,
        `#`,
        csvContent,
      ].join("\n")

      return new Response(headerInfo, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="my-attendance-${startDate}-to-${endDate}.csv"`,
        },
      })
    }

    if (format === "excel") {
      const exportData = {
        format: "excel",
        data: attendanceRecords.map((record) => ({
          ...record,
          user_profiles: {
            first_name: userProfile?.first_name,
            last_name: userProfile?.last_name,
            employee_id: userProfile?.employee_id,
            departments: userProfile?.departments,
          },
        })),
        summary: {
          totalRecords: attendanceRecords.length,
          totalWorkHours: attendanceRecords.reduce((sum, record) => sum + (record.work_hours || 0), 0),
          averageWorkHours:
            attendanceRecords.length > 0
              ? attendanceRecords.reduce((sum, record) => sum + (record.work_hours || 0), 0) / attendanceRecords.length
              : 0,
          statusCounts: attendanceRecords.reduce(
            (acc, record) => {
              acc[record.status] = (acc[record.status] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          ),
        },
        filters: {
          startDate,
          endDate,
          reportType: "personal_attendance",
          employeeName: `${userProfile?.first_name} ${userProfile?.last_name}`,
          employeeId: userProfile?.employee_id,
          department: userProfile?.departments?.name,
        },
      }

      const response = await fetch(`${request.nextUrl.origin}/api/admin/reports/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: request.headers.get("Authorization") || "",
          Cookie: request.headers.get("Cookie") || "",
        },
        body: JSON.stringify(exportData),
      })

      if (!response.ok) {
        throw new Error("Failed to generate Excel export")
      }

      const blob = await response.blob()
      return new Response(blob, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="my-attendance-${startDate}-to-${endDate}.xlsx"`,
        },
      })
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
  } catch (error) {
    console.error("Personal export error:", error)
    return NextResponse.json({ error: "Failed to export personal attendance data" }, { status: 500 })
  }
}
