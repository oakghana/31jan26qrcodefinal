import { type NextRequest, NextResponse } from "next/server"
import { rateLimit, getClientIdentifier, sanitizeInput, createSecurityHeaders } from "@/lib/security"

const JSON_HEADERS = {
  ...createSecurityHeaders(),
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: JSON_HEADERS,
  })
}

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      message: "Email validation API is operational",
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: JSON_HEADERS },
  )
}

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request)
    const isAllowed = rateLimit(clientId, {
      windowMs: 5 * 60 * 1000,
      maxRequests: 10,
    })

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many validation attempts. Please try again later.", exists: false },
        { status: 429, headers: JSON_HEADERS },
      )
    }

    console.log("[v0] Email validation API called")

    let email: string
    try {
      const body = await request.json()
      email = sanitizeInput(body.email?.trim()?.toLowerCase())
      console.log("[v0] Validating email:", email)
    } catch (parseError) {
      console.error("[v0] Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request body", exists: false }, { status: 400, headers: JSON_HEADERS })
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required", exists: false }, { status: 400, headers: JSON_HEADERS })
    }

    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format", exists: false }, { status: 400, headers: JSON_HEADERS })
    }

    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    const { data: user, error: queryError } = await supabase
      .from("user_profiles")
      .select("id, email, is_active, first_name, last_name")
      .ilike("email", email)
      .maybeSingle()

    if (queryError) {
      console.error("[v0] Database error:", queryError)
      return NextResponse.json(
        {
          error: "Database error during validation",
          exists: false,
        },
        { status: 500, headers: JSON_HEADERS },
      )
    }

    if (!user) {
      console.log("[v0] Email not found:", email)
      return NextResponse.json(
        {
          error: "This email is not registered in the QCC system.",
          exists: false,
        },
        { status: 404, headers: JSON_HEADERS },
      )
    }

    if (!user.is_active) {
      console.log("[v0] User account not active:", email)
      return NextResponse.json(
        {
          exists: true,
          approved: false,
          message: "Account pending approval",
        },
        { status: 200, headers: JSON_HEADERS },
      )
    }

    console.log("[v0] Email validation successful:", email)
    return NextResponse.json(
      {
        exists: true,
        approved: true,
        message: "Email validated successfully",
      },
      { status: 200, headers: JSON_HEADERS },
    )
  } catch (error) {
    console.error("[v0] Email validation error:", error)
    return NextResponse.json(
      {
        error: "Server error occurred",
        exists: false,
      },
      { status: 500, headers: JSON_HEADERS },
    )
  }
}
