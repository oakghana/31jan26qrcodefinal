import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/server"
import { Clock, Calendar, MapPin, Users, TrendingUp, UserCheck, AlertCircle } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  console.log("[v0] Dashboard - User ID:", user.id)
  console.log("[v0] Dashboard - User email:", user.email)

  // Get user profile with error handling
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(`
      *,
      departments (
        name,
        code
      )
    `)
    .eq("id", user.id)
    .maybeSingle() // Use maybeSingle instead of single to handle missing records

  console.log("[v0] Dashboard - Profile data:", profile)
  console.log("[v0] Dashboard - Profile error:", profileError)

  // If no profile exists, show a message to contact admin
  if (!profile && !profileError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-primary">Profile Setup Required</CardTitle>
              <CardDescription>Your account needs to be set up by an administrator.</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">User ID: {user.id}</p>
              <p className="text-sm text-muted-foreground">Email: {user.email?.split("@")[0]}</p>
              <p className="text-sm">Please contact your IT administrator to complete your profile setup.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  let pendingApprovals = 0
  if (profile?.role === "admin") {
    const { count } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false)

    pendingApprovals = count || 0
  }

  // Get today's attendance with error handling
  const today = new Date().toISOString().split("T")[0]
  const { data: todayAttendance, error: attendanceError } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("user_id", user.id)
    .gte("check_in_time", `${today}T00:00:00`)
    .lt("check_in_time", `${today}T23:59:59`)
    .maybeSingle()

  console.log("[v0] Dashboard - Today's attendance:", todayAttendance)
  console.log("[v0] Dashboard - Attendance error:", attendanceError)

  // Get this month's attendance count with error handling
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { count: monthlyAttendance, error: monthlyError } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("check_in_time", startOfMonth)

  console.log("[v0] Dashboard - Monthly attendance:", monthlyAttendance)
  console.log("[v0] Dashboard - Monthly error:", monthlyError)

  // Get total locations with error handling
  const { count: totalLocations, error: locationsError } = await supabase
    .from("geofence_locations")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  console.log("[v0] Dashboard - Total locations:", totalLocations)
  console.log("[v0] Dashboard - Locations error:", locationsError)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {profile?.first_name || user.email?.split("@")[0]} {profile?.last_name || ""}
          </p>
        </div>

        {profile?.role === "admin" && pendingApprovals > 0 && (
          <Alert className="border-secondary/50 bg-secondary/10">
            <AlertCircle className="h-4 w-4 text-secondary" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-secondary font-medium">
                {pendingApprovals} user{pendingApprovals > 1 ? "s" : ""} awaiting approval
              </span>
              <Button asChild size="sm" className="ml-4">
                <Link href="/dashboard/user-approvals">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Review Now
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Today's Status"
            value={todayAttendance ? "Checked In" : "Not Checked In"}
            description={
              todayAttendance
                ? `At ${new Date(todayAttendance.check_in_time).toLocaleTimeString()}`
                : "Click to check in"
            }
            icon={Clock}
          />

          <StatsCard
            title="This Month"
            value={monthlyAttendance || 0}
            description="Days attended"
            icon={Calendar}
            trend={{ value: 5, isPositive: true }}
          />

          <StatsCard title="QCC Locations" value={totalLocations || 0} description="Active campuses" icon={MapPin} />

          <StatsCard
            title="Department"
            value={profile?.departments?.code || "N/A"}
            description={profile?.departments?.name || "No department assigned"}
            icon={Users}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <QuickActions />
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {todayAttendance ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Checked in today</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(todayAttendance.check_in_time).toLocaleString()}
                        </p>
                      </div>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No attendance recorded today</p>
                    <p className="text-sm text-muted-foreground mt-1">Use the quick actions to check in</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Overview
            </CardTitle>
            <CardDescription>Your attendance statistics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{monthlyAttendance || 0}</div>
                <div className="text-sm text-muted-foreground">Days This Month</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {monthlyAttendance ? Math.round((monthlyAttendance / new Date().getDate()) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Attendance Rate</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {profile?.role === "admin"
                    ? "Administrator"
                    : profile?.role === "department_head"
                      ? "Department Head"
                      : "Staff"}
                </div>
                <div className="text-sm text-muted-foreground">Role</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
