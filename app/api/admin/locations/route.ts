import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: locations, error } = await supabase.from("geofence_locations").select("*").order("name")

    if (error) throw error

    return NextResponse.json(locations)
  } catch (error) {
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
