import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] User Location API - Starting request")
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] User Location API - Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User Location API - User authenticated:", user.id)

    // Get user profile with assigned location
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(`
        id,
        role,
        assigned_location_id,
        geofence_locations!assigned_location_id (
          id,
          name,
          address,
          latitude,
          longitude,
          radius_meters,
          district_id,
          check_in_start_time,
          check_out_end_time,
          require_early_checkout_reason,
          working_hours_description
        )
      `)
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.log("[v0] User Location API - Profile error:", profileError)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { data: locations, error } = await supabase
      .from("geofence_locations")
      .select(`
        id,
        name,
        address,
        latitude,
        longitude,
        radius_meters,
        district_id,
        check_in_start_time,
        check_out_end_time,
        require_early_checkout_reason,
        working_hours_description
      `)
      .eq("is_active", true)
      .order("name")

    if (error) {
      console.error("[v0] User Location API - Database error:", error)
      return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
    }

    console.log("[v0] User Location API - Found locations:", locations?.length)

    return NextResponse.json({
      success: true,
      data: locations,
      user_role: profile.role,
      assigned_location_id: profile.assigned_location_id,
      assigned_location: profile.geofence_locations,
      message: "All QCC locations available for attendance within 50m proximity range",
    })
  } catch (error) {
    console.error("[v0] User Location API - Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
