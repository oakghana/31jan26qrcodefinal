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

    // Log the logout action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "logout",
      table_name: "auth_sessions",
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout logging error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
