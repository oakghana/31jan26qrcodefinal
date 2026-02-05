import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DashboardOverviewClient } from "@/components/dashboard/dashboard-overview-client"

export default function DashboardOverviewPage() {
  return (
    <DashboardLayout>
      <DashboardOverviewClient />
    </DashboardLayout>
  )
}
