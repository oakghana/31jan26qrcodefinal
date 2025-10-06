import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { HRExcuseDutyClient } from "@/components/admin/hr-excuse-duty-client"

export default async function HRExcuseDutyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR Excuse Duty Portal</h1>
        <p className="text-muted-foreground mt-2">
          Process and archive excuse duty requests approved by department heads
        </p>
      </div>

      <HRExcuseDutyClient />
    </div>
  )
}
