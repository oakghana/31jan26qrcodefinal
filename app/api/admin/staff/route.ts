import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Staff API - GET request received")

    const supabase = await createClient()

    // Get authenticated user and check admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Staff API - Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin or department_head role
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).maybeSingle()

    if (!profile || !["admin", "department_head"].includes(profile.role)) {
      console.log("[v0] Staff API - Insufficient permissions")
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get search parameters
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const department = searchParams.get("department") || ""
    const role = searchParams.get("role") || ""

    console.log("[v0] Staff API - Query params:", { page, limit, search, department, role })

    let query = supabase.from("user_profiles").select("*")

    // Apply filters
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_id.ilike.%${search}%,email.ilike.%${search}%`,
      )
    }

    if (department) {
      query = query.eq("department_id", department)
    }

    if (role) {
      query = query.eq("role", role)
    }

    // Get total count
    const { count } = await supabase.from("user_profiles").select("*", { count: "exact", head: true })

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false })

    const { data: staff, error } = await query

    if (error) {
      console.error("[v0] Staff fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 })
    }

    console.log("[v0] Staff API - Successfully fetched", staff?.length, "records")

    const staffWithDepartments = await Promise.all(
      (staff || []).map(async (member) => {
        if (member.department_id) {
          const { data: dept } = await supabase
            .from("departments")
            .select("name, code")
            .eq("id", member.department_id)
            .maybeSingle()

          return {
            ...member,
            departments: dept,
          }
        }
        return {
          ...member,
          departments: null,
        }
      }),
    )

    return NextResponse.json({
      success: true,
      data: staffWithDepartments,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Staff API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user and check admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, first_name, last_name, employee_id, department_id, position, role } = body

    // Generate a UUID for the new user
    const userId = randomUUID()

    // Insert user profile directly
    const { data: newProfile, error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        email,
        first_name,
        last_name,
        employee_id,
        department_id: department_id || null,
        position,
        role: role || "staff",
        is_active: false, // Inactive until they sign up
        is_approved: true, // Pre-approved by admin
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileError) {
      console.error("Profile creation error:", profileError)
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 400 })
    }

    // Log the action
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "create_staff",
      details: `Created staff profile for ${email}`,
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({
      success: true,
      data: newProfile,
      message: "Staff member created successfully. They need to sign up with their email to activate their account.",
    })
  } catch (error) {
    console.error("Create staff error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
