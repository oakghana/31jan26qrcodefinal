import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { OverviewContentClient } from "@/components/dashboard/overview-content-client"

export default async function DashboardOverviewPage() {
  return (
    <DashboardLayout>
      <OverviewContentClient />
    </DashboardLayout>
  )
}
