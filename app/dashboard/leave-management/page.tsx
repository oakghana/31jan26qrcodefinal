import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { LeaveManagementClient } from "@/components/leave/leave-management-client"

export default function LeaveManagementPage() {
  return (
    <DashboardLayout>
      <LeaveManagementClient />
    </DashboardLayout>
  )
}
