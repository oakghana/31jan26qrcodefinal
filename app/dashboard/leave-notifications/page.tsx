import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { LeaveNotificationsClient } from "@/components/leave/leave-notifications-client"

export default async function LeaveNotificationsManagementPage() {
  return (
    <DashboardLayout>
      <LeaveNotificationsClient />
    </DashboardLayout>
  )
}
