import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all active departments for public access (staff registration)
    const { data: departments, error } = await supabase
      .from("departments")
      .select(`
        id,
        name,
        code,
        description
      `)
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("Public departments fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      departments: departments || [],
      data: departments || [],
    })
  } catch (error) {
    console.error("Public departments API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
