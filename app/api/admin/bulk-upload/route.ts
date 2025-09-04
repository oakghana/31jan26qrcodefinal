import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check admin permissions
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim())
    const rows = lines.slice(1)

    let success = 0
    let failed = 0
    const errors: Array<{ row: number; error: string }> = []

    // Process each row based on type
    for (let i = 0; i < rows.length; i++) {
      const values = rows[i].split(",").map((v) => v.trim())
      const rowData: any = {}

      headers.forEach((header, index) => {
        rowData[header] = values[index] || ""
      })

      try {
        switch (type) {
          case "staff":
            await processStaffRow(supabase, rowData)
            break
          case "departments":
            await processDepartmentRow(supabase, rowData)
            break
          case "locations":
            await processLocationRow(supabase, rowData)
            break
          case "regions":
            await processRegionRow(supabase, rowData)
            break
          case "districts":
            await processDistrictRow(supabase, rowData)
            break
          default:
            throw new Error(`Unknown upload type: ${type}`)
        }
        success++
      } catch (error) {
        failed++
        errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({ success, failed, errors })
  } catch (error) {
    console.error("Bulk upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processStaffRow(supabase: any, data: any) {
  // Validate required fields
  if (!data.employee_id || !data.email || !data.first_name || !data.last_name) {
    throw new Error("Missing required fields: employee_id, email, first_name, last_name")
  }

  // Validate 7-digit employee ID
  if (!/^\d{7}$/.test(data.employee_id)) {
    throw new Error("Employee ID must be exactly 7 digits")
  }

  // Get department ID from code
  let departmentId = null
  if (data.department_code) {
    const { data: dept } = await supabase.from("departments").select("id").eq("code", data.department_code).single()
    departmentId = dept?.id
  }

  // Create user profile (auth user creation handled by trigger)
  const { error } = await supabase.from("user_profiles").insert({
    employee_id: data.employee_id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone || null,
    department_id: departmentId,
    position: data.position || "Staff",
    role: data.role || "staff",
  })

  if (error) throw error
}

async function processDepartmentRow(supabase: any, data: any) {
  if (!data.name || !data.code) {
    throw new Error("Missing required fields: name, code")
  }

  const { error } = await supabase.from("departments").insert({
    name: data.name,
    code: data.code.toUpperCase(),
    description: data.description || null,
  })

  if (error) throw error
}

async function processLocationRow(supabase: any, data: any) {
  if (!data.name || !data.latitude || !data.longitude) {
    throw new Error("Missing required fields: name, latitude, longitude")
  }

  const { error } = await supabase.from("geofence_locations").insert({
    name: data.name,
    address: data.address || "",
    latitude: Number.parseFloat(data.latitude),
    longitude: Number.parseFloat(data.longitude),
    radius_meters: Number.parseInt(data.radius_meters) || 20,
  })

  if (error) throw error
}

async function processRegionRow(supabase: any, data: any) {
  if (!data.name || !data.code) {
    throw new Error("Missing required fields: name, code")
  }

  const { error } = await supabase.from("regions").insert({
    name: data.name,
    code: data.code.toUpperCase(),
    country: data.country || "Ghana",
  })

  if (error) throw error
}

async function processDistrictRow(supabase: any, data: any) {
  if (!data.name || !data.region_code) {
    throw new Error("Missing required fields: name, region_code")
  }

  // Get region ID from code
  const { data: region } = await supabase.from("regions").select("id").eq("code", data.region_code).single()

  if (!region) {
    throw new Error(`Region not found: ${data.region_code}`)
  }

  const { error } = await supabase.from("districts").insert({
    name: data.name,
    region_id: region.id,
    latitude: data.latitude ? Number.parseFloat(data.latitude) : null,
    longitude: data.longitude ? Number.parseFloat(data.longitude) : null,
  })

  if (error) throw error
}
