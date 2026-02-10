import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { calculateDistance } from "@/lib/location-utils"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const startTime = performance.now()

  try {
    const supabase = await createClient()

    // Get user (should be cached by middleware)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { location_id, latitude, longitude, accuracy, device_info, location_name, is_remote_location } = body

    // Check today's attendance in parallel
    const today = new Date().toISOString().split("T")[0]
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("id, check_in_time")
      .eq("user_id", user.id)
      .gte("check_in_time", `${today}T00:00:00`)
      .lt("check_in_time", `${today}T23:59:59`)
      .maybeSingle()

    if (existingRecord?.check_in_time) {
      const checkInTime = new Date(existingRecord.check_in_time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })

      return NextResponse.json(
        {
          error: "You have already checked in today",
          message: `You checked in at ${checkInTime}`,
          timestamp: existingRecord.check_in_time,
          type: "duplicate_checkin",
        },
        { status: 400 }
      )
    }

    // SERVER-SIDE DISTANCE VALIDATION: Enforce device radius settings
    if (latitude && longitude && location_id) {
      // Fetch location coordinates and device radius in parallel
      const [
        { data: locationData },
        { data: deviceRadiusSettings },
      ] = await Promise.all([
        supabase
          .from("geofence_locations")
          .select("name, latitude, longitude")
          .eq("id", location_id)
          .single(),
        supabase
          .from("device_radius_settings")
          .select("device_type, check_in_radius_meters")
          .eq("is_active", true),
      ])

      if (locationData?.latitude && locationData?.longitude) {
        const deviceType = device_info?.device_type || "desktop"
        let maxCheckInRadius = 1000
        if (deviceRadiusSettings && deviceRadiusSettings.length > 0) {
          const setting = deviceRadiusSettings.find((s: any) => s.device_type === deviceType)
          if (setting) {
            maxCheckInRadius = setting.check_in_radius_meters
          }
        }

        const distanceToLocation = calculateDistance(
          latitude,
          longitude,
          locationData.latitude,
          locationData.longitude,
        )

        console.log("[v0] Fast check-in distance validation:", {
          distance: Math.round(distanceToLocation),
          maxRadius: maxCheckInRadius,
          deviceType,
          location: locationData.name,
        })

        if (distanceToLocation > maxCheckInRadius) {
          return NextResponse.json(
            {
              error: `You are ${Math.round(distanceToLocation).toLocaleString()} meters from ${locationData.name}. Check-in requires being within ${maxCheckInRadius} meters.`,
            },
            { status: 400 }
          )
        }
      }
    }

    // Insert attendance record (optimized query)
    const { data: record, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        user_id: user.id,
        check_in_time: new Date().toISOString(),
        check_in_location_id: location_id,
        check_in_location_name: location_name,
        latitude,
        longitude,
        accuracy,
        device_info,
        is_remote_location: is_remote_location || false,
      })
      .select("id, check_in_time")
      .single()

    if (insertError) {
      console.error("[v0] Check-in insertion error:", insertError)
      return NextResponse.json(
        { error: "Failed to record check-in" },
        { status: 500 }
      )
    }

    const elapsedTime = performance.now() - startTime

    return NextResponse.json({
      success: true,
      message: "Checked in successfully",
      data: record,
      performanceMetrics: {
        elapsedMs: Math.round(elapsedTime),
      },
    })
  } catch (error) {
    console.error("[v0] Fast check-in error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
