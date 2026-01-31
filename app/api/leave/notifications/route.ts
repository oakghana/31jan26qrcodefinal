import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    let query = supabase
      .from("leave_notifications")
      .select(
        `
        id,
        user_id,
        staff:user_profiles(first_name, last_name),
        leave_type,
        start_date,
        end_date,
        reason,
        status,
        created_at
      `
      )

    // Filter based on role
    if (profile.role === "admin") {
      // Admin sees all leave notifications
      query = query.eq("is_dismissed", false)
    } else if (profile.role === "regional_manager") {
      // Regional manager sees staff in their region
      query = query
        .eq("is_dismissed", false)
        .in("status", ["pending", "approved", "rejected"])
    } else if (profile.role === "department_head") {
      // Department head sees their department's staff
      const { data: deptStaff } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("department_id", profile.department_id)

      const staffIds = deptStaff?.map(s => s.id) || []
      query = query.in("user_id", staffIds).eq("is_dismissed", false)
    } else {
      // Staff only sees their own notifications
      query = query.eq("user_id", user.id)
    }

    const { data: notifications, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    // Format the response
    const formattedNotifications = notifications?.map(notif => ({
      id: notif.id,
      user_id: notif.user_id,
      staff_name: `${notif.staff?.first_name} ${notif.staff?.last_name}`,
      leave_type: notif.leave_type,
      start_date: notif.start_date,
      end_date: notif.end_date,
      reason: notif.reason,
      status: notif.status,
      created_at: notif.created_at,
      can_dismiss: profile.role !== "staff" || notif.status !== "pending",
    })) || []

    return NextResponse.json(formattedNotifications)
  } catch (error) {
    console.error("Error fetching leave notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch leave notifications" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, notificationId, newStatus } = await request.json()

    if (action === "dismiss") {
      const { error } = await supabase
        .from("leave_notifications")
        .update({ is_dismissed: true })
        .eq("id", notificationId)

      if (error) throw error

      return NextResponse.json({ success: true, message: "Notification dismissed" })
    }

    if (action === "approve" || action === "reject") {
      // Check if user has permission to approve/reject
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!["admin", "regional_manager", "department_head"].includes(profile?.role)) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 })
      }

      const { error: updateError } = await supabase
        .from("leave_notifications")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", notificationId)

      if (updateError) throw updateError

      // If approved, update the user's leave status
      if (action === "approve") {
        const { data: notif } = await supabase
          .from("leave_notifications")
          .select("user_id, start_date, end_date")
          .eq("id", notificationId)
          .single()

        if (notif) {
          await supabase
            .from("user_profiles")
            .update({
              leave_status: "on_leave",
              leave_start_date: notif.start_date,
              leave_end_date: notif.end_date,
            })
            .eq("id", notif.user_id)
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Leave ${action === "approve" ? "approved" : "rejected"}` 
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error processing leave notification:", error)
    return NextResponse.json(
      { error: "Failed to process leave notification" },
      { status: 500 }
    )
  }
}
