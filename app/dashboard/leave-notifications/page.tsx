import { LeaveNotificationsClient } from "@/components/leave/leave-notifications-client"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

export default function LeaveNotificationsManagementPage() {
  return (
    <DashboardLayout>
      <LeaveNotificationsClient />
    </DashboardLayout>
  )
}
