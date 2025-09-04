import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
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

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const action = searchParams.get("action")
    const userId = searchParams.get("user_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")

    let query = supabase
      .from("audit_logs")
      .select(`
        *,
        user_profiles!audit_logs_user_id_fkey (
          first_name,
          last_name,
          employee_id,
          email
        )
      `)
      .order("created_at", { ascending: false })

    // Apply filters
    if (action) {
      query = query.eq("action", action)
    }
    if (userId) {
      query = query.eq("user_id", userId)
    }
    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: auditLogs, error: auditError, count } = await query

    if (auditError) {
      console.error("Audit logs error:", auditError)
      return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase.from("audit_logs").select("*", { count: "exact", head: true })

    return NextResponse.json({
      data: auditLogs,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Audit logs API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
