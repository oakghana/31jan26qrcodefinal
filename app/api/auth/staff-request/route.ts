import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, firstName, lastName, email, phone, employeeId, position, departmentId } = body

    const supabase = await createClient()

    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone || null,
      employee_id: employeeId || null,
      position: position || null,
      department_id: departmentId || null,
      role: "staff",
      is_active: false, // Set as inactive by default
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("Profile creation error:", profileError)
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 })
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "staff_request_submitted",
      table_name: "user_profiles",
      record_id: userId,
      new_values: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        status: "pending_approval",
      },
      created_at: new Date().toISOString(),
    })

    if (auditError) {
      console.error("Audit log error:", auditError)
    }

    return NextResponse.json({
      message: "Staff request submitted successfully",
      userId: userId,
    })
  } catch (error) {
    console.error("Staff request error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
