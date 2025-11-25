import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "Location code is required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vgtajtqxgczhjboatvol.supabase.co"
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzUyNDgsImV4cCI6MjA3MjU1MTI0OH0.EuuTCRC-rDoz_WHl4pwpV6_fEqrqcgGroa4nTjAEn1k"

    const supabase = createClient(supabaseUrl, supabaseKey)

    let { data: location, error } = await supabase
      .from("geofence_locations")
      .select("*")
      .eq("location_code", code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle()

    if (!location && !error) {
      const { data: nameMatch } = await supabase
        .from("geofence_locations")
        .select("*")
        .ilike("name", `%${code}%`)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle()

      location = nameMatch
    }

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
