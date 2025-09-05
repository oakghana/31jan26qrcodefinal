import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { currentPassword, newPassword } = await request.json()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })

    if (verifyError) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error("Password update error:", updateError)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "password_changed",
      table_name: "auth.users",
      ip_address: request.ip || null,
      user_agent: request.headers.get("user-agent"),
    })

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
