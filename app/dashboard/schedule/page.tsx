import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ScheduleClient } from "@/components/schedule/schedule-client"

export default function SchedulePage() {
  return (
    <DashboardLayout>
      <ScheduleClient />
    </DashboardLayout>
  )
}
