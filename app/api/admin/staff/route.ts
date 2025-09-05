import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Staff API - Starting GET request")

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Staff API - Auth error:", authError)
      return NextResponse.json(
        { success: false, error: "Authentication required", data: [] },
        { status: 401, headers: { "Content-Type": "application/json" } },
      )
    }

    console.log("[v0] Staff API - User authenticated:", user.id)

    const { data: staff, error: staffError } = await supabase
      .from("user_profiles")
      .select(`
        id,
        employee_id,
        first_name,
        last_name,
        email,
        phone,
        department_id,
        position,
        role,
        hire_date,
        is_active,
        assigned_location_id,
        profile_image_url,
        created_at,
        updated_at,
        departments:department_id(id, name, code),
        geofence_locations:assigned_location_id(id, name, address)
      `)
      .order("created_at", { ascending: false })

    if (staffError) {
      console.error("[v0] Staff API - Query error:", staffError)
      return NextResponse.json(
        { success: false, error: "Failed to fetch staff", data: [] },
        { status: 500, headers: { "Content-Type": "application/json" } },
      )
    }

    console.log("[v0] Staff API - Fetched", staff?.length || 0, "staff members")

    return NextResponse.json(
      {
        success: true,
        data: staff || [],
        message: "Staff fetched successfully",
      },
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[v0] Staff API - Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        data: [],
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Staff API - Starting POST request")

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401, headers: { "Content-Type": "application/json" } },
      )
    }

    // Check admin permissions
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403, headers: { "Content-Type": "application/json" } },
      )
    }

    const body = await request.json()
    const { email, first_name, last_name, employee_id, department_id, position, role, assigned_location_id, password } =
      body

    const { data: authUser, error: authCreateError } = await supabase.auth.admin.createUser({
      email,
      password: password || "TempPassword123!", // Default password if not provided
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        first_name,
        last_name,
        employee_id,
      },
    })

    if (authCreateError) {
      console.error("[v0] Staff API - Auth user creation error:", authCreateError)
      return NextResponse.json(
        { success: false, error: "Failed to create user account" },
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    const { data: newProfile, error: insertError } = await supabase
      .from("user_profiles")
      .insert({
        id: authUser.user.id, // Use the auth user ID
        email,
        first_name,
        last_name,
        employee_id,
        department_id: department_id || null,
        assigned_location_id: assigned_location_id || null,
        position: position || null,
        role: role || "staff",
        is_active: true,
      })
      .select(`
        *,
        departments:department_id(id, name, code),
        geofence_locations:assigned_location_id(id, name, address)
      `)
      .single()

    if (insertError) {
      console.error("[v0] Staff API - Profile insert error:", insertError)
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { success: false, error: "Failed to create staff profile" },
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    console.log("[v0] Staff API - Staff member created successfully")
    return NextResponse.json(
      {
        success: true,
        data: newProfile,
        message: "Staff member created successfully",
      },
      { status: 201, headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("[v0] Staff API POST - Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
