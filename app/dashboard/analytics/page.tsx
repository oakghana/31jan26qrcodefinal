import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AnalyticsPage() {
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
    <AnalyticsDashboard />
  )
}
