import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
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

    // Get all active geofence locations
    const { data: locations, error } = await supabase
      .from("geofence_locations")
      .select(`
        id,
        name,
        address,
        latitude,
        longitude,
        radius_meters,
        districts (
          name,
          regions (
            name
          )
        )
      `)
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("Locations error:", error)
      return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: locations,
    })
  } catch (error) {
    console.error("Locations API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
