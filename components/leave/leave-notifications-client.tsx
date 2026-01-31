"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Bell,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LeaveNotificationCard, type LeaveNotification } from "@/components/leave/leave-notification-card"

export function LeaveNotificationsClient() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<LeaveNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get user profile to determine role
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      setUserRole(profile?.role || null)

      // Fetch leave notifications based on role
      let query = supabase
        .from("leave_requests")
        .select(`
          *,
          user:user_profiles!leave_requests_user_id_fkey (
            first_name,
            last_name,
            employee_id,
            departments (
              name
            )
          ),
          approver:user_profiles!leave_requests_approver_id_fkey (
            first_name,
            last_name
          )
        `)
        .order("created_at", { ascending: false })

      if (profile?.role === "staff") {
        query = query.eq("user_id", user.id)
      } else if (profile?.role === "department_head") {
        // Department heads see requests from their department
        const { data: deptProfile } = await supabase
          .from("user_profiles")
          .select("department_id")
          .eq("id", user.id)
          .single()

        if (deptProfile?.department_id) {
          query = query.eq("user.user_profiles.department_id", deptProfile.department_id)
        }
      }
      // Regional managers and admins see all

      const { data, error } = await query

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      // Refresh notifications
      await fetchNotifications()
    } catch (error) {
      console.error("Error approving request:", error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedNotifId || !rejectionReason.trim()) return

    setProcessingId(selectedNotifId)
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedNotifId)

      if (error) throw error

      setShowRejectDialog(false)
      setRejectionReason("")
      setSelectedNotifId(null)

      // Refresh notifications
      await fetchNotifications()
    } catch (error) {
      console.error("Error rejecting request:", error)
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = notifications.filter(n => n.status === "pending").length
  const approvedCount = notifications.filter(n => n.status === "approved").length
  const rejectedCount = notifications.filter(n => n.status === "rejected").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground tracking-tight">
              Leave Notifications
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium">
              Manage leave requests and notifications
            </p>
          </div>
        </div>
      </div>

      {userRole !== "staff" && pendingCount > 0 && (
        <Alert className="border-primary/20 bg-primary/5 shadow-sm">
          <AlertCircle className="h-5 w-5 text-primary" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-primary font-semibold text-base">
              {pendingCount} leave request{pendingCount > 1 ? "s" : ""} awaiting approval
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Approved requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">Rejected requests</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="all" className="font-semibold">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="font-semibold">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="approved" className="font-semibold">
            Approved ({approvedCount})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="font-semibold">
            Rejected ({rejectedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {notifications.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No leave notifications</p>
                <p className="text-sm text-muted-foreground">Leave requests will appear here</p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <LeaveNotificationCard
                key={notification.id}
                notification={notification}
                userRole={userRole}
                onApprove={handleApprove}
                onReject={(id) => {
                  setSelectedNotifId(id)
                  setShowRejectDialog(true)
                }}
                processingId={processingId}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {notifications.filter(n => n.status === "pending").length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No pending requests</p>
              </CardContent>
            </Card>
          ) : (
            notifications
              .filter(n => n.status === "pending")
              .map((notification) => (
                <LeaveNotificationCard
                  key={notification.id}
                  notification={notification}
                  userRole={userRole}
                  onApprove={handleApprove}
                  onReject={(id) => {
                    setSelectedNotifId(id)
                    setShowRejectDialog(true)
                  }}
                  processingId={processingId}
                />
              ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {notifications.filter(n => n.status === "approved").length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No approved requests</p>
              </CardContent>
            </Card>
          ) : (
            notifications
              .filter(n => n.status === "approved")
              .map((notification) => (
                <LeaveNotificationCard
                  key={notification.id}
                  notification={notification}
                  userRole={userRole}
                  onApprove={handleApprove}
                  onReject={(id) => {
                    setSelectedNotifId(id)
                    setShowRejectDialog(true)
                  }}
                  processingId={processingId}
                />
              ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {notifications.filter(n => n.status === "rejected").length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No rejected requests</p>
              </CardContent>
            </Card>
          ) : (
            notifications
              .filter(n => n.status === "rejected")
              .map((notification) => (
                <LeaveNotificationCard
                  key={notification.id}
                  notification={notification}
                  userRole={userRole}
                  onApprove={handleApprove}
                  onReject={(id) => {
                    setSelectedNotifId(id)
                    setShowRejectDialog(true)
                  }}
                  processingId={processingId}
                />
              ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingId === selectedNotifId}
              >
                {processingId === selectedNotifId ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}