import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { user_id, action, success, method, user_agent } = body

    // Log the login activity
    const { error } = await supabase.from("audit_logs").insert({
      user_id,
      action,
      table_name: "auth_sessions",
      new_values: {
        success,
        method,
        timestamp: new Date().toISOString(),
      },
      ip_address: request.ip || null,
      user_agent: user_agent || request.headers.get("user-agent"),
    })

    if (error) {
      console.error("Failed to log login activity:", error)
      return NextResponse.json({ error: "Failed to log activity" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Login logging error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
