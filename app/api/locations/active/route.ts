import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: locations, error } = await supabase
      .from("geofence_locations")
      .select("id, name, address, location_code")
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("[v0] Failed to fetch locations:", error)
      return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
    }

    return NextResponse.json({ locations: locations || [] })
  } catch (error) {
    console.error("[v0] Locations API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
