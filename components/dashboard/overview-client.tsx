"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { StatsCard } from "@/components/dashboard/stats-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { LeaveNotificationsCard } from "@/components/leave/leave-notifications-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, Calendar, Users, TrendingUp, UserCheck, AlertCircle, Loader } from "lucide-react"
import Link from "next/link"
import { MobileAppDownload } from "@/components/ui/mobile-app-download"

export function OverviewClient() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)
  const [monthlyAttendance, setMonthlyAttendance] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()
        
        if (!currentUser) return

        setUser(currentUser)

        const { data: profileData } = await supabase
          .from("user_profiles")
          .select(`
            *,
            departments (
              name,
              code
            )
          `)
          .eq("id", currentUser.id)
          .maybeSingle()

        setProfile(profileData)

        const today = new Date().toISOString().split("T")[0]
        const { data: todayData } = await supabase
          .from("attendance_records")
          .select("*")
          .eq("user_id", currentUser.id)
          .gte("check_in_time", `${today}T00:00:00`)
          .lt("check_in_time", `${today}T23:59:59`)
          .maybeSingle()

        setTodayAttendance(todayData)

        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const { count: monthCount } = await supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("user_id", currentUser.id)
          .gte("check_in_time", startOfMonth)

        setMonthlyAttendance(monthCount || 0)

        if (profileData?.role === "admin") {
          const { count } = await supabase
            .from("user_profiles")
            .select("*", { count: "exact", head: true })
            .eq("is_active", false)

          setPendingApprovals(count || 0)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-lg text-muted-foreground font-medium">
            Welcome back,{" "}
            <span className="text-primary font-semibold">{profile?.first_name || user?.email?.split("@")[0]}</span>{" "}
            {profile?.last_name || ""}
          </p>
        </div>

        {profile?.role === "admin" && pendingApprovals > 0 && (
          <Alert className="border-primary/20 bg-primary/5 shadow-sm">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-primary font-semibold text-base">
                {pendingApprovals} user{pendingApprovals > 1 ? "s" : ""} awaiting approval
              </span>
              <Button asChild size="sm" className="ml-4 shadow-sm hover:shadow-md transition-shadow">
                <Link href="/dashboard/user-approvals">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Review Now
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Today's Status"
            value={todayAttendance ? "Checked In" : "Not Checked In"}
            description={
              todayAttendance
                ? `At ${new Date(todayAttendance.check_in_time).toLocaleTimeString()}`
                : "Click to check in"
            }
            icon={Clock}
            variant={todayAttendance ? "success" : "default"}
          />

          <StatsCard
            title="This Month"
            value={monthlyAttendance || 0}
            description="Days attended"
            icon={Calendar}
            trend={{ value: 5, isPositive: true }}
          />

          <StatsCard
            title="Department"
            value={profile?.departments?.code || "N/A"}
            description={profile?.departments?.name || "No department assigned"}
            icon={Users}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <QuickActions />
          </div>

          <div className="lg:col-span-3">
            <LeaveNotificationsCard />
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-heading font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Overview
            </CardTitle>
            <CardDescription className="text-base">Your attendance statistics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/10">
                <div className="text-3xl font-heading font-bold text-primary mb-2">{monthlyAttendance || 0}</div>
                <div className="text-sm font-medium text-muted-foreground">Days This Month</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-chart-2/5 to-chart-2/10 rounded-xl border border-chart-2/10">
                <div className="text-3xl font-heading font-bold text-chart-2 mb-2">
                  {monthlyAttendance ? Math.round((monthlyAttendance / new Date().getDate()) * 100) : 0}%
                </div>
                <div className="text-sm font-medium text-muted-foreground">Attendance Rate</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-chart-3/5 to-chart-3/10 rounded-xl border border-chart-3/10">
                <div className="text-lg font-heading font-bold text-chart-3 mb-2">
                  {profile?.role === "admin"
                    ? "Administrator"
                    : profile?.role === "department_head"
                      ? "Department Head"
                      : "Staff"}
                </div>
                <div className="text-sm font-medium text-muted-foreground">Role</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <MobileAppDownload variant="dashboard" />
    </>
  )
}
