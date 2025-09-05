import { type NextRequest, NextResponse } from "next/server"

function createJsonResponse(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  })
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Staff API - Starting GET request")

    const startTime = Date.now()

    let createClient
    try {
      const supabaseModule = await import("@/lib/supabase/server")
      createClient = supabaseModule.createClient
    } catch (importError) {
      console.error("[v0] Staff API - Import error:", importError)
      return createJsonResponse(
        {
          success: false,
          error: "Server configuration error",
          data: [],
        },
        500,
      )
    }

    let supabase
    try {
      supabase = await createClient()
    } catch (clientError) {
      console.error("[v0] Staff API - Client creation error:", clientError)
      return createJsonResponse(
        {
          success: false,
          error: "Database connection error",
          data: [],
        },
        500,
      )
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Staff API - Auth error:", authError)
      return createJsonResponse({ success: false, error: "Authentication required", data: [] }, { status: 401 })
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
        updated_at
      `)
      .order("created_at", { ascending: false })

    if (staffError) {
      console.error("[v0] Staff API - Query error:", staffError)
      return createJsonResponse({ success: false, error: "Failed to fetch staff", data: [] }, { status: 500 })
    }

    const departmentIds = [...new Set(staff?.map((s) => s.department_id).filter(Boolean))]
    const locationIds = [...new Set(staff?.map((s) => s.assigned_location_id).filter(Boolean))]

    const [departmentsResult, locationsResult] = await Promise.all([
      departmentIds.length > 0
        ? supabase.from("departments").select("id, name, code").in("id", departmentIds)
        : { data: [], error: null },
      locationIds.length > 0
        ? supabase.from("geofence_locations").select("id, name, address").in("id", locationIds)
        : { data: [], error: null },
    ])

    const departmentsMap = new Map(departmentsResult.data?.map((d) => [d.id, d]) || [])
    const locationsMap = new Map(locationsResult.data?.map((l) => [l.id, l]) || [])

    const enrichedStaff =
      staff?.map((staffMember) => ({
        ...staffMember,
        departments: staffMember.department_id ? departmentsMap.get(staffMember.department_id) || null : null,
        geofence_locations: staffMember.assigned_location_id
          ? locationsMap.get(staffMember.assigned_location_id) || null
          : null,
      })) || []

    console.log("[v0] Staff API - Fetched", enrichedStaff.length, "staff members")
    console.log("[v0] Staff API - Response time:", Date.now() - startTime, "ms")

    return createJsonResponse({
      success: true,
      data: enrichedStaff,
      message: "Staff fetched successfully",
    })
  } catch (error) {
    console.error("[v0] Staff API - Unexpected error:", error)
    return createJsonResponse(
      {
        success: false,
        error: "Internal server error",
        data: [],
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Staff API - Starting POST request")

    let supabase, adminSupabase
    try {
      const supabaseModule = await import("@/lib/supabase/server")
      supabase = await supabaseModule.createClient()

      // Create admin client with service role key
      const { createClient } = await import("@supabase/supabase-js")
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase admin credentials")
      }

      adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      console.log("[v0] Staff API - Admin client created successfully")
    } catch (clientError) {
      console.error("[v0] Staff API POST - Client creation error:", clientError)
      return createJsonResponse(
        {
          success: false,
          error: "Database connection error",
        },
        500,
      )
    }

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return createJsonResponse({ success: false, error: "Authentication required" }, 401)
    }

    // Check admin permissions
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return createJsonResponse({ success: false, error: "Admin access required" }, 403)
    }

    const body = await request.json()
    const { email, first_name, last_name, employee_id, department_id, position, role, assigned_location_id, password } =
      body

    const { data: existingAuthUser } = await adminSupabase.auth.admin.listUsers()
    const userExists = existingAuthUser.users.find((u) => u.email === email)

    if (userExists) {
      console.log("[v0] Staff API - User with email already exists:", email)
      return createJsonResponse(
        {
          success: false,
          error: "User with this email already exists",
          details: "Please use a different email address",
        },
        400,
      )
    }

    const { data: authUser, error: authCreateError } = await adminSupabase.auth.admin.createUser({
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
      console.error("[v0] Staff API - Auth user creation error:", authCreateError.message)
      return createJsonResponse(
        {
          success: false,
          error: "Failed to create user account",
          details: authCreateError.message,
        },
        400,
      )
    }

    console.log("[v0] Staff API - Auth user created successfully:", authUser.user.id)

    const { data: existingProfile } = await adminSupabase
      .from("user_profiles")
      .select("id")
      .eq("id", authUser.user.id)
      .single()

    let newProfile, insertError

    if (existingProfile) {
      console.log("[v0] Staff API - Updating existing profile:", authUser.user.id)
      // Update existing profile
      const { data, error } = await adminSupabase
        .from("user_profiles")
        .update({
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
        .eq("id", authUser.user.id)
        .select(`
          *,
          departments:department_id(id, name, code),
          geofence_locations:assigned_location_id(id, name, address)
        `)
        .single()

      newProfile = data
      insertError = error
    } else {
      console.log("[v0] Staff API - Creating new profile:", authUser.user.id)
      // Insert new profile
      const { data, error } = await adminSupabase
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

      newProfile = data
      insertError = error
    }

    if (insertError) {
      console.error("[v0] Staff API - Profile insert/update error:", insertError)
      // Clean up auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(authUser.user.id)
      return createJsonResponse(
        {
          success: false,
          error: "Failed to create staff profile",
          details: insertError.message,
        },
        400,
      )
    }

    console.log("[v0] Staff API - Staff member created successfully")
    return createJsonResponse(
      {
        success: true,
        data: newProfile,
        message: "Staff member created successfully",
      },
      201,
    )
  } catch (error) {
    console.error("[v0] Staff API POST - Unexpected error:", error)
    return createJsonResponse(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    )
  }
}

export async function OPTIONS() {
  return createJsonResponse({ message: "Method allowed" })
}
