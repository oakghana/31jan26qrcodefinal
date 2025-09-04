import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StaffManagement } from "@/components/admin/staff-management"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function StaffPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Check if user has admin or department_head role
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (!profile || !["admin", "department_head"].includes(profile.role)) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Staff Management</h1>
          <p className="text-muted-foreground mt-2">Manage QCC staff members, roles, and permissions</p>
        </div>

        <StaffManagement />
      </div>
    </DashboardLayout>
  )
}
