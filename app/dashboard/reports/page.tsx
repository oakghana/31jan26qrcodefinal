import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AttendanceReports } from "@/components/admin/attendance-reports"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Check if user has admin or department_head role
  const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

  if (!profile || !["admin", "regional_manager", "department_head"].includes(profile.role)) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 md:space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <AttendanceReports />
      </div>
    </DashboardLayout>
  )
}
