import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if email exists in user_profiles
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, email, is_active, first_name, last_name")
      .eq("email", email.toLowerCase())
      .single()

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            "This email is not registered in the QCC system. Please contact your administrator or use a registered email address.",
          exists: false,
        },
        { status: 404 },
      )
    }

    if (!data.is_active) {
      return NextResponse.json(
        {
          error: "Your account is pending admin approval. Please wait for activation before using OTP login.",
          exists: true,
          approved: false,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      exists: true,
      approved: true,
      message: "Email validated successfully",
    })
  } catch (error) {
    console.error("Email validation error:", error)
    return NextResponse.json({ error: "Failed to validate email" }, { status: 500 })
  }
}
