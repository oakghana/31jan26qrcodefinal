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

  if (!profile || !["admin", "department_head"].includes(profile.role)) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive attendance reports and insights</p>
        </div>

        <AttendanceReports />
      </div>
    </DashboardLayout>
  )
}
