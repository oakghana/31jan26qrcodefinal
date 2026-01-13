import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

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
    const lastSunday = new Date(today)

    // Go back to last Sunday
    lastSunday.setDate(today.getDate() - today.getDay())
    // If today is not Sunday, go back one more week
    if (today.getDay() !== 0) {
      lastSunday.setDate(lastSunday.getDate() - 7)
    }

    const lastMonday = new Date(lastSunday)
    lastMonday.setDate(lastSunday.getDate() - 6)

    const weekStart = lastMonday.toISOString().split("T")[0]
    const weekEnd = lastSunday.toISOString().split("T")[0]

    console.log("[v0] Fetching weekly summary for week:", weekStart, "to", weekEnd, "for user:", targetUserId)

    const { data: records, error: recordsError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("user_id", targetUserId)
      .gte("check_in_time", `${weekStart}T00:00:00`)
      .lte("check_in_time", `${weekEnd}T23:59:59`)
      .order("check_in_time", { ascending: true })

    if (recordsError) {
      console.error("[v0] Error fetching attendance records:", recordsError)
      throw recordsError
    }

    console.log("[v0] Found", records?.length || 0, "attendance records")

    const standardCheckInTime = 8 * 60 // 8:00 AM in minutes

    const daysWorked = new Set(records?.map((r) => r.check_in_time.split("T")[0])).size

    const totalCheckIns = records?.length || 0
    const totalCheckOuts = records?.filter((r) => r.check_out_time).length || 0

    const totalWorkHours =
      records?.reduce((sum, r) => {
        return sum + (Number(r.work_hours) || 0)
      }, 0) || 0

    const daysOnTime =
      records?.filter((r) => {
        const checkInDate = new Date(r.check_in_time)
        const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes()
        return checkInMinutes <= standardCheckInTime
      }).length || 0

    const daysLate =
      records?.filter((r) => {
        const checkInDate = new Date(r.check_in_time)
        const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes()
        return checkInMinutes > standardCheckInTime
      }).length || 0

    const earlyCheckouts =
      records?.filter((r) => {
        if (!r.check_out_time || !r.early_checkout_reason) return false
        return true
      }).length || 0

    // Get user profile for name
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, email, departments(name)")
      .eq("id", targetUserId)
      .single()

    const workDaysInWeek = 5
    const daysAbsent = workDaysInWeek - daysWorked

    const summary = {
      weekStart,
      weekEnd,
      userName: profile ? `${profile.first_name} ${profile.last_name}` : "User",
      userEmail: profile?.email,
      department: profile?.departments?.name,
      daysWorked,
      totalCheckIns, // Added check-in count
      totalCheckOuts, // Added check-out count
      totalWorkHours: totalWorkHours.toFixed(2),
      daysOnTime,
      daysLate,
      daysAbsent,
      earlyCheckouts,
      records: records || [],
      performance:
        daysWorked >= 5 ? "excellent" : daysWorked >= 4 ? "good" : daysWorked >= 3 ? "fair" : "needs improvement",
    }

    console.log("[v0] Calculated summary:", summary)

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error("[v0] Error in weekly summary:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch weekly summary" }, { status: 500 })
  }
}
