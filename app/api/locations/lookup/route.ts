import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Location code is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: location, error } = await supabase
      .from("geofence_locations")
      .select("*")
      .eq("location_code", code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle()

    if (error || !location) {
      console.log("[v0] Location not found for code:", code)
      return NextResponse.json(
        {
          error: "Location not found",
          message: `No active location found with code '${code}'. Please check the code and try again.`,
        },
        { status: 404 },
      )
    }

    console.log("[v0] Location found for code:", code, "->", location.name)

    return NextResponse.json({
      success: true,
      location: {
        id: location.id,
        name: location.name,
        code: location.location_code,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    })
  } catch (error) {
    console.error("[v0] Location lookup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
