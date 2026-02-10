import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { OverviewClient } from "@/components/dashboard/overview-client"

export default async function DashboardOverviewPage() {
  return (
    <DashboardLayout>
      <OverviewClient />
    </DashboardLayout>
  )
}
