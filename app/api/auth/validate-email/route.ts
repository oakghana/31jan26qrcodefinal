import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Email validation API called")

    const { email } = await request.json()

    if (!email) {
      console.log("[v0] No email provided")
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[v0] Validating email:", email)

    let supabase
    try {
      supabase = await createClient()
      console.log("[v0] Supabase client created successfully")
    } catch (clientError) {
      console.error("[v0] Failed to create Supabase client:", clientError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          exists: false,
        },
        { status: 500 },
      )
    }

    const { data: allUsers, error: allUsersError } = await supabase
      .from("user_profiles")
      .select("id, email, is_active, first_name, last_name")
      .limit(10)

    console.log("[v0] All users in database (first 10):", allUsers)
    console.log("[v0] All users query error:", allUsersError)

    let data, error
    const { data: caseInsensitiveMatch, error: caseInsensitiveError } = await supabase
      .from("user_profiles")
      .select("id, email, is_active, first_name, last_name")
      .ilike("email", email) // Case-insensitive search
      .maybeSingle()

    console.log("[v0] Email validation query result:", { caseInsensitiveMatch, caseInsensitiveError })
    console.log("[v0] Searching for email (case-insensitive):", email)

    if (caseInsensitiveError) {
      console.error("[v0] Database error during email validation:", caseInsensitiveError)
      return NextResponse.json(
        {
          error: "Database error during validation",
          exists: false,
        },
        { status: 500 },
      )
    }

    if (!caseInsensitiveMatch) {
      console.log("[v0] Email not found in user_profiles:", email)
      const { data: exactMatch, error: exactError } = await supabase
        .from("user_profiles")
        .select("id, email, is_active, first_name, last_name")
        .eq("email", email.toLowerCase())
        .maybeSingle()

      console.log("[v0] Exact match fallback result:", { exactMatch, exactError })

      if (!exactMatch) {
        return NextResponse.json(
          {
            error:
              "This email is not registered in the QCC system. Please contact your administrator or use a registered email address.",
            exists: false,
          },
          { status: 404 },
        )
      }
      // Use exact match data if found
      data = exactMatch
    } else {
      data = caseInsensitiveMatch
    }

    if (!data.is_active) {
      console.log("[v0] User account not active but allowing OTP:", email)
      return NextResponse.json({
        exists: true,
        approved: false,
        message: "Account pending approval - OTP will be sent but login may be restricted",
      })
    }

    console.log("[v0] Email validation successful:", email)
    return NextResponse.json({
      exists: true,
      approved: true,
      message: "Email validated successfully",
    })
  } catch (error) {
    console.error("[v0] Email validation error:", error)
    return NextResponse.json(
      {
        error: "Failed to validate email",
        exists: false,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
