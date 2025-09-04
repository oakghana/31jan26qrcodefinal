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
    if (action && action !== "all") {
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

    const { data: auditLogs, error: auditError } = await query

    if (auditError) {
      console.error("Audit logs export error:", auditError)
      return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 })
    }

    // Generate CSV content
    const csvHeaders = ["Date/Time", "User Name", "Employee ID", "Email", "Action", "Table", "IP Address", "User Agent"]

    const csvRows = auditLogs.map((log) => [
      new Date(log.created_at).toISOString(),
      `${log.user_profiles?.first_name || ""} ${log.user_profiles?.last_name || ""}`.trim(),
      log.user_profiles?.employee_id || "",
      log.user_profiles?.email || "",
      log.action,
      log.table_name || "",
      log.ip_address || "",
      log.user_agent || "",
    ])

    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.map((field) => `"${field}"`).join(","))].join(
      "\n",
    )

    // Log the export action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "export_audit_logs",
      table_name: "audit_logs",
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Audit logs export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
