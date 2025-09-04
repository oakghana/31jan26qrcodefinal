import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { AttendanceRecorder } from "@/components/attendance/attendance-recorder"
import { createClient } from "@/lib/supabase/server"

export default async function AttendancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Get today's attendance
  const today = new Date().toISOString().split("T")[0]
  const { data: todayAttendance } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("user_id", user.id)
    .gte("check_in_time", `${today}T00:00:00`)
    .lt("check_in_time", `${today}T23:59:59`)
    .single()

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Attendance</h1>
          <p className="text-muted-foreground mt-2">Record your daily attendance at QCC locations</p>
        </div>

        <AttendanceRecorder todayAttendance={todayAttendance} />
      </div>
    </DashboardLayout>
  )
}
