import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Locations API - Starting request")
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Locations API - User authenticated:", user.id)

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || !["admin", "it-admin", "department_head"].includes(profile.role)) {
      console.log("[v0] Locations API - Insufficient permissions for role:", profile?.role)
      return NextResponse.json({ error: "Insufficient permissions to view locations" }, { status: 403 })
    }

    console.log("[v0] Locations API - Role check passed for:", profile.role)

    const { data: locations, error } = await supabase.from("geofence_locations").select("*").order("name")

    if (error) throw error

    console.log("[v0] Locations API - Fetched", locations?.length, "locations")

    return NextResponse.json(locations)
  } catch (error) {
    console.error("[v0] Locations API - Error:", error)
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: location, error } = await supabase
      .from("geofence_locations")
      .insert([
        {
          name: body.name,
          address: body.address,
          latitude: body.latitude,
          longitude: body.longitude,
          radius_meters: body.radius_meters,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(location)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 })
  }
}
