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

    // Calculate last week's date range (Monday to Sunday)
    const today = new Date()
    const lastSunday = new Date(today)
    lastSunday.setDate(today.getDate() - today.getDay()) // Go to last Sunday
    if (today.getDay() !== 0) {
      lastSunday.setDate(lastSunday.getDate() - 7) // Go back one more week if not Sunday
    }

    const lastMonday = new Date(lastSunday)
    lastMonday.setDate(lastSunday.getDate() - 6) // Go back 6 days to Monday

    const weekStart = lastMonday.toISOString().split("T")[0]
    const weekEnd = lastSunday.toISOString().split("T")[0]

    // Fetch attendance records for the week
    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", targetUserId)
      .gte("check_in_time", `${weekStart}T00:00:00`)
      .lte("check_in_time", `${weekEnd}T23:59:59`)
      .order("check_in_time", { ascending: true })

    if (recordsError) throw recordsError

    // Calculate statistics
    const standardCheckInTime = new Date(`2000-01-01T08:00:00`)
    const standardCheckOutTime = new Date(`2000-01-01T17:00:00`)

    const daysWorked = new Set(records?.map((r) => r.check_in_time.split("T")[0])).size
    const totalWorkHours = records?.reduce((sum, r) => sum + (r.work_hours || 0), 0) || 0
    const daysOnTime =
      records?.filter((r) => {
        const checkInTime = new Date(`2000-01-01T${new Date(r.check_in_time).toTimeString().split(" ")[0]}`)
        return checkInTime <= standardCheckInTime
      }).length || 0
    const daysLate =
      records?.filter((r) => {
        const checkInTime = new Date(`2000-01-01T${new Date(r.check_in_time).toTimeString().split(" ")[0]}`)
        return checkInTime > standardCheckInTime
      }).length || 0
    const earlyCheckouts =
      records?.filter((r) => {
        if (!r.check_out_time) return false
        const checkOutTime = new Date(`2000-01-01T${new Date(r.check_out_time).toTimeString().split(" ")[0]}`)
        return checkOutTime < standardCheckOutTime
      }).length || 0

    // Get user profile for name
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, email, departments(name)")
      .eq("id", targetUserId)
      .single()

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
      daysAbsent: 5 - daysWorked, // Assuming 5-day work week
      earlyCheckouts,
      records: records || [],
      performance:
        daysWorked >= 5 ? "excellent" : daysWorked >= 4 ? "good" : daysWorked >= 3 ? "fair" : "needs improvement",
    }

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error("Error fetching weekly summary:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch weekly summary" }, { status: 500 })
  }
}
