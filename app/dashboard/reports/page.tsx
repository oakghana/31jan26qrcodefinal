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
    <div className="bg-gradient-to-br from-neutral-900 via-gray-900 to-black py-6">
      <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-4">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Reports & Analytics
          </h1>
        </div>

        <div className="rounded-2xl shadow-xl bg-neutral-900/80 border border-neutral-800 p-2">
          <AttendanceReports />
        </div>
      </div>
    </div>
  )
}
