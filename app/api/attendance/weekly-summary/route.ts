import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get target user ID (defaults to current user)
    const targetUserId = userId || user.id

    const today = new Date()
    const dayOfWeek = today.getDay()

    // Get Monday of current week
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)

    // Get Sunday of current week
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    const weekStart = monday.toISOString().split("T")[0]
    const weekEnd = sunday.toISOString().split("T")[0]

    console.log("[v0] Fetching attendance for week:", weekStart, "to", weekEnd, "for user:", targetUserId)

    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", targetUserId)
      .gte("check_in_time", `${weekStart}T00:00:00`)
      .lte("check_in_time", `${weekEnd}T23:59:59`)
      .order("check_in_time", { ascending: true })

    if (recordsError) {
      console.error("[v0] Error fetching records:", recordsError)
      throw recordsError
    }

    console.log("[v0] Found", records?.length || 0, "attendance records")

    const standardCheckInTime = 8 * 60 // 8:00 AM in minutes
    const standardCheckOutTime = 17 * 60 // 5:00 PM in minutes

    // Count total check-ins and check-outs
    const totalCheckIns = records?.length || 0
    const totalCheckOuts = records?.filter((r) => r.check_out_time !== null).length || 0

    // Count unique days worked
    const uniqueDays = new Set(records?.map((r) => r.check_in_time.split("T")[0]))
    const daysWorked = uniqueDays.size

    // Calculate total work hours
    const totalWorkHours = records?.reduce((sum, r) => sum + (r.work_hours || 0), 0) || 0

    // Count on-time and late arrivals
    let daysOnTime = 0
    let daysLate = 0

    records?.forEach((r) => {
      const checkInDate = new Date(r.check_in_time)
      const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes()

      if (checkInMinutes <= standardCheckInTime) {
        daysOnTime++
      } else {
        daysLate++
      }
    })

    // Count early checkouts
    const earlyCheckouts =
      records?.filter((r) => {
        if (!r.check_out_time) return false
        const checkOutDate = new Date(r.check_out_time)
        const checkOutMinutes = checkOutDate.getHours() * 60 + checkOutDate.getMinutes()
        return checkOutMinutes < standardCheckOutTime
      }).length || 0

    // Calculate expected work days (Mon-Fri only)
    let expectedWorkDays = 0
    for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      if (day !== 0 && day !== 6) expectedWorkDays++ // Skip weekends
    }

    const daysAbsent = expectedWorkDays - daysWorked

    // Get user profile for name
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, email, departments(name)")
      .eq("id", targetUserId)
      .single()

    // Determine performance rating
    const attendanceRate = expectedWorkDays > 0 ? (daysWorked / expectedWorkDays) * 100 : 0
    let performance = "needs improvement"
    if (attendanceRate >= 90) performance = "excellent"
    else if (attendanceRate >= 75) performance = "good"
    else if (attendanceRate >= 60) performance = "fair"

    const summary = {
      weekStart,
      weekEnd,
      userName: profile ? `${profile.first_name} ${profile.last_name}` : "User",
      userEmail: profile?.email,
      department: profile?.departments?.name,
      daysWorked,
      totalWorkHours: totalWorkHours.toFixed(2),
      daysOnTime,
      daysLate,
      daysAbsent: Math.max(0, daysAbsent),
      earlyCheckouts,
      totalCheckIns,
      totalCheckOuts,
      records: records || [],
      performance,
    }

    console.log("[v0] Weekly summary calculated:", summary)

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error("[v0] Error fetching weekly summary:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch weekly summary" }, { status: 500 })
  }
}
