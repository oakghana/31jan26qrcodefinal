import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { ValidationError, createValidationError } from "@/lib/validation" // Declare ValidationError and createValidationError

function validateEmail(email: string, isRequired = true): void {
  if (!email || email.trim() === "") {
    if (isRequired) {
      throw createValidationError(`Email is required`, "email", email, "MISSING_EMAIL")
    }
    return // Skip validation if email is empty and not required
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    // Don't throw error, just log warning - allow invalid emails to be imported
    console.warn(`Warning: Invalid email format: ${email} - can be corrected after import`)
  }
}

function validateEmployeeId(employeeId: string, isRequired = true): void {
  if (!employeeId || employeeId.trim() === "") {
    if (isRequired) {
      throw createValidationError(`Employee ID is required`, "employee_id", employeeId, "MISSING_EMPLOYEE_ID")
    }
    return
  }

  if (!/^\d{7}$/.test(employeeId)) {
    // Don't throw error, just log warning - allow invalid employee IDs to be imported
    console.warn(`Warning: Employee ID should be 7 digits, got: ${employeeId} - can be corrected after import`)
  }
}

function validateCoordinates(lat: string, lng: string): void {
  const latitude = Number.parseFloat(lat)
  const longitude = Number.parseFloat(lng)

  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw createValidationError(
      `Invalid latitude: ${lat}. Must be between -90 and 90`,
      "latitude",
      lat,
      "INVALID_LATITUDE",
    )
  }

  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw createValidationError(
      `Invalid longitude: ${lng}. Must be between -180 and 180`,
      "longitude",
      lng,
      "INVALID_LONGITUDE",
    )
  }
}

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

    if (lines.length === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }

    const headers = lines[0].split(",").map((h) => h.trim())
    const rows = lines.slice(1)

    let success = 0
    let failed = 0
    const errors: Array<{ row: number; error: string; field?: string; code?: string }> = []

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
            throw createValidationError(`Unsupported upload type: ${type}`, "type", type, "INVALID_TYPE")
        }
        success++
      } catch (error) {
        failed++
        if (error instanceof ValidationError) {
          errors.push({
            row: i + 2,
            error: error.message,
            field: error.field,
            code: error.code,
          })
        } else if (error && typeof error === "object" && "message" in error) {
          // Handle Supabase database errors
          const dbError = error as any
          let errorMessage = dbError.message || "Database error occurred"

          if (dbError.code === "23505") {
            errorMessage = `Duplicate entry detected. This record may already exist in the database.`
          } else if (dbError.code === "23503") {
            errorMessage = `Referenced record not found. Please check foreign key relationships.`
          } else if (dbError.code === "23502") {
            errorMessage = `Required field is missing or null.`
          }

          errors.push({
            row: i + 2,
            error: errorMessage,
            code: dbError.code || "DATABASE_ERROR",
          })
        } else {
          errors.push({
            row: i + 2,
            error: `Unexpected error: ${String(error)}`,
            code: "UNKNOWN_ERROR",
          })
        }
      }
    }

    return NextResponse.json({ success, failed, errors })
  } catch (error) {
    console.error("Bulk upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processStaffRow(supabase: any, data: any) {
  const requiredFields = ["first_name", "last_name"]
  const missingFields = requiredFields.filter((field) => !data[field] || data[field].trim() === "")

  if (missingFields.length > 0) {
    throw createValidationError(
      `Missing required fields: ${missingFields.join(", ")}`,
      missingFields[0],
      "",
      "MISSING_REQUIRED_FIELDS",
    )
  }

  validateEmployeeId(data.employee_id, false) // Not required
  validateEmail(data.email, false) // Not required

  if (data.phone && !/^[0-9+\-\s()]{10,15}$/.test(data.phone)) {
    console.warn(`Warning: Invalid phone number format: ${data.phone} - can be corrected after import`)
  }

  let departmentId = null
  if (data.department_code) {
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("id")
      .eq("code", data.department_code)
      .single()
    if (deptError || !dept) {
      console.warn(`Warning: Department not found with code: ${data.department_code} - user created without department`)
      departmentId = null // Allow creation without department
    } else {
      departmentId = dept.id
    }
  }

  const validRoles = ["staff", "admin", "department_head"]
  let userRole = "staff" // Default role
  if (data.role && validRoles.includes(data.role)) {
    userRole = data.role
  } else if (data.role) {
    console.warn(`Warning: Invalid role: ${data.role} - defaulting to 'staff'`)
  }

  let employeeId = data.employee_id
  if (!employeeId || !/^\d{7}$/.test(employeeId)) {
    // Generate a temporary employee ID
    employeeId = `TEMP${Date.now().toString().slice(-6)}`
    console.warn(`Warning: Generated temporary employee ID: ${employeeId} - please update after import`)
  }

  let email = data.email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // Generate a temporary email
    email = `${data.first_name?.toLowerCase() || "user"}.${data.last_name?.toLowerCase() || "temp"}@temp.qccgh.com`
    console.warn(`Warning: Generated temporary email: ${email} - please update after import`)
  }

  // Create user profile with lenient data
  const { error } = await supabase.from("user_profiles").insert({
    employee_id: employeeId,
    first_name: data.first_name,
    last_name: data.last_name,
    email: email,
    phone: data.phone || null,
    department_id: departmentId,
    position: data.position || "Staff",
    role: userRole,
    is_active: true, // Default to active
  })

  if (error) throw error
}

async function processDepartmentRow(supabase: any, data: any) {
  if (!data.name || data.name.trim() === "") {
    throw createValidationError("Department name is required", "name", data.name, "MISSING_NAME")
  }

  if (!data.code || data.code.trim() === "") {
    throw createValidationError("Department code is required", "code", data.code, "MISSING_CODE")
  }

  if (data.code.length > 10) {
    throw createValidationError(
      `Department code too long: ${data.code}. Maximum 10 characters allowed`,
      "code",
      data.code,
      "CODE_TOO_LONG",
    )
  }

  const { error } = await supabase.from("departments").insert({
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    description: data.description?.trim() || null,
  })

  if (error) throw error
}

async function processLocationRow(supabase: any, data: any) {
  if (!data.name || data.name.trim() === "") {
    throw createValidationError("Location name is required", "name", data.name, "MISSING_NAME")
  }

  if (!data.latitude || !data.longitude) {
    throw createValidationError(
      "Both latitude and longitude are required",
      "coordinates",
      `${data.latitude}, ${data.longitude}`,
      "MISSING_COORDINATES",
    )
  }

  validateCoordinates(data.latitude, data.longitude)

  const radiusMeters = data.radius_meters ? Number.parseInt(data.radius_meters) : 20
  if (isNaN(radiusMeters) || radiusMeters < 5 || radiusMeters > 1000) {
    throw createValidationError(
      `Invalid radius: ${data.radius_meters}. Must be between 5 and 1000 meters`,
      "radius_meters",
      data.radius_meters,
      "INVALID_RADIUS",
    )
  }

  const { error } = await supabase.from("geofence_locations").insert({
    name: data.name.trim(),
    address: data.address?.trim() || "",
    latitude: Number.parseFloat(data.latitude),
    longitude: Number.parseFloat(data.longitude),
    radius_meters: radiusMeters,
  })

  if (error) throw error
}

async function processRegionRow(supabase: any, data: any) {
  if (!data.name || data.name.trim() === "") {
    throw createValidationError("Region name is required", "name", data.name, "MISSING_NAME")
  }

  if (!data.code || data.code.trim() === "") {
    throw createValidationError("Region code is required", "code", data.code, "MISSING_CODE")
  }

  if (data.code.length > 5) {
    throw createValidationError(
      `Region code too long: ${data.code}. Maximum 5 characters allowed`,
      "code",
      data.code,
      "CODE_TOO_LONG",
    )
  }

  const { error } = await supabase.from("regions").insert({
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    country: data.country?.trim() || "Ghana",
  })

  if (error) throw error
}

async function processDistrictRow(supabase: any, data: any) {
  if (!data.name || data.name.trim() === "") {
    throw createValidationError("District name is required", "name", data.name, "MISSING_NAME")
  }

  if (!data.region_code || data.region_code.trim() === "") {
    throw createValidationError("Region code is required", "region_code", data.region_code, "MISSING_REGION_CODE")
  }

  // Get region ID from code
  const { data: region, error: regionError } = await supabase
    .from("regions")
    .select("id")
    .eq("code", data.region_code.trim().toUpperCase())
    .single()

  if (regionError || !region) {
    throw createValidationError(
      `Region not found with code: ${data.region_code}`,
      "region_code",
      data.region_code,
      "REGION_NOT_FOUND",
    )
  }

  // Validate coordinates if provided
  if (data.latitude && data.longitude) {
    validateCoordinates(data.latitude, data.longitude)
  }

  const { error } = await supabase.from("districts").insert({
    name: data.name.trim(),
    region_id: region.id,
    latitude: data.latitude ? Number.parseFloat(data.latitude) : null,
    longitude: data.longitude ? Number.parseFloat(data.longitude) : null,
  })

  if (error) throw error
}
