import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json()
    console.log("[v0] Staff lookup request for identifier:", identifier)

    const supabase = await createClient()

    // Check if identifier is an email or staff number
    const isEmail = identifier.includes("@")

    if (isEmail) {
      console.log("[v0] Identifier is email, returning as is")
      return NextResponse.json({ email: identifier })
    }

    const staffNumberRegex = /^\d{7}$/
    if (!staffNumberRegex.test(identifier)) {
      console.log("[v0] Invalid staff number format:", identifier)
      return NextResponse.json({ error: "Staff number must be exactly 7 digits" }, { status: 400 })
    }

    console.log("[v0] Looking up staff number in database:", identifier)

    // Look up staff number in user_profiles table
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("email, employee_id, first_name, last_name")
      .eq("employee_id", identifier)
      .single()

    console.log("[v0] Database query result:", { profile, error })

    if (error) {
      console.log("[v0] Database error:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Staff number not found in system" }, { status: 404 })
      }
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    if (!profile) {
      console.log("[v0] No profile found for staff number:", identifier)
      return NextResponse.json({ error: "Staff number not found" }, { status: 404 })
    }

    console.log("[v0] Found profile for staff:", profile.first_name, profile.last_name)
    return NextResponse.json({ email: profile.email })
  } catch (error) {
    console.error("[v0] Staff lookup error:", error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
