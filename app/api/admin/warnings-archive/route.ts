import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, department_id")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin", "regional_manager", "department_head"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get("department_id")
    const warningType = searchParams.get("warning_type")
    const search = searchParams.get("search")

    let query = supabase.from("staff_warnings").select("*").order("created_at", { ascending: false })

    // Filter by department if not admin
    if (profile.role === "department_head" && profile.department_id) {
      query = query.eq("department_id", profile.department_id)
    } else if (departmentId && departmentId !== "all") {
      query = query.eq("department_id", departmentId)
    }

    // Filter by warning type
    if (warningType && warningType !== "all") {
      query = query.eq("warning_type", warningType)
    }

    const { data: warnings, error: warningsError } = await query

    if (warningsError) {
      console.error("Error fetching warnings:", warningsError)
      return NextResponse.json({ error: "Failed to fetch warnings" }, { status: 500 })
    }

    const recipientIds = [...new Set(warnings?.map((w) => w.recipient_id) || [])]
    const senderIds = [...new Set(warnings?.map((w) => w.sender_id) || [])]
    const allUserIds = [...new Set([...recipientIds, ...senderIds])]

    // Attempt to use the service-role (admin) Supabase client to look up user profiles reliably
    let userProfiles: any[] = []

    if (allUserIds.length === 0) {
      // No users to look up
      userProfiles = []
    } else {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (supabaseUrl && supabaseServiceKey) {
          const { createClient: createPublicClient } = await import("@supabase/supabase-js")
          const adminClient = createPublicClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })

          const { data: upData, error: upError } = await adminClient
            .from("user_profiles")
            .select(
              `
              id,
              first_name,
              last_name,
              email,
              department_id,
              departments (
                name
              )
            `,
            )
            .in("id", allUserIds)

          if (upError) {
            console.error("[v0] Failed to fetch user profiles via admin client:", upError)
          } else {
            userProfiles = upData || []
          }
        } else {
          console.warn("[v0] Service role not available; falling back to RLS-aware client for user profile lookup")
        }
      } catch (err) {
        console.error("[v0] Exception while fetching user profiles:", err)
      }

      // Fallback to RLS-aware client if admin lookup didn't return results
      if (!userProfiles || userProfiles.length === 0) {
        try {
          const { data: upData, error: upError } = await supabase
            .from("user_profiles")
            .select(
              `
              id,
              first_name,
              last_name,
              email,
              department_id,
              departments (
                name
              )
            `,
            )
            .in("id", allUserIds)

          if (upError) {
            console.error("[v0] Failed to fetch user profiles via RLS client:", upError)
          } else {
            userProfiles = upData || []
          }
        } catch (err) {
          console.error("[v0] Exception while fetching user profiles (RLS fallback):", err)
        }
      }
    }

    const userMap = new Map(userProfiles?.map((user) => [user.id, user]) || [])

    let formattedWarnings = (warnings || []).map((warning: any) => {
      const recipient = userMap.get(warning.recipient_id)
      const sender = userMap.get(warning.sender_id)

      return {
        id: warning.id,
        recipient_id: warning.recipient_id,
        recipient_name: recipient ? `${recipient.first_name} ${recipient.last_name}` : "Unknown",
        recipient_email: recipient?.email || "Unknown",
        department_name: recipient?.departments?.name || "Unknown",
        sender_id: warning.sender_id,
        sender_name: sender ? `${sender.first_name} ${sender.last_name}` : "Unknown",
        sender_role: warning.sender_role,
        sender_label: warning.sender_label,
        subject: warning.subject,
        message: warning.message,
        warning_type: warning.warning_type,
        attendance_date: warning.attendance_date,
        is_read: warning.is_read,
        read_at: warning.read_at,
        created_at: warning.created_at,
      }
    })

    if (search) {
      const searchLower = search.toLowerCase()
      formattedWarnings = formattedWarnings.filter(
        (warning) =>
          warning.recipient_name.toLowerCase().includes(searchLower) ||
          warning.recipient_email.toLowerCase().includes(searchLower) ||
          warning.subject?.toLowerCase().includes(searchLower) ||
          warning.message?.toLowerCase().includes(searchLower),
      )
    }

    return NextResponse.json({ warnings: formattedWarnings })
  } catch (error) {
    console.error("Error in warnings archive API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
