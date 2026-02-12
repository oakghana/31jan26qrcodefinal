'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Bell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LeaveNotificationCard, type LeaveNotification } from '@/components/leave/leave-notification-card'

export default function LeaveNotificationsManagementPage() {
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

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role, department_id")
        .eq("id", user.id)
        .single()

      if (!profile) {
        setLoading(false)
        return
      }

      setUserRole(profile.role)

      if (!["admin", "regional_manager", "department_head"].includes(profile.role)) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/leave/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (notificationId: string) => {
    setProcessingId(notificationId)
    try {
      const response = await fetch("/api/leave/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          notificationId,
        }),
      })

      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error("Error approving leave:", error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedNotifId) return

    setProcessingId(selectedNotifId)
    try {
      const response = await fetch("/api/leave/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          notificationId: selectedNotifId,
        }),
      })

      if (response.ok) {
        await fetchNotifications()
        setShowRejectDialog(false)
        setRejectionReason("")
        setSelectedNotifId(null)
      }
    } catch (error) {
      console.error("Error rejecting leave:", error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDismiss = async (notificationId: string) => {
    setProcessingId(notificationId)
    try {
      const response = await fetch("/api/leave/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          notificationId,
        }),
      })

      if (response.ok) {
        await fetchNotifications()
      }
    } catch (error) {
      console.error("Error dismissing notification:", error)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading leave notifications...</p>
          </div>
        </div>
      </>
    )
  }

  if (!['admin', 'regional_manager', 'department_head'].includes(userRole || '')) {
    return (
      <>
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You don't have permission to manage leave notifications.
          </AlertDescription>
        </Alert>
      </>
    )
  }

  const pendingNotifications = notifications.filter(n => n.status === "pending")
  const approvedNotifications = notifications.filter(n => n.status === "approved")
  const rejectedNotifications = notifications.filter(n => n.status === "rejected")

  const roleBadge = {
    admin: { label: "Administrator", color: "bg-red-100 text-red-800 border-red-200" },
    regional_manager: { label: "Regional Manager", color: "bg-blue-100 text-blue-800 border-blue-200" },
    department_head: { label: "Department Head", color: "bg-green-100 text-green-800 border-green-200" },
  }

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Leave Notifications</h1>
            <p className="text-muted-foreground">Manage leave requests from your team</p>
          </div>
          <Badge className={`ml-auto ${roleBadge[userRole as keyof typeof roleBadge]?.color || ''} border`}>
            {roleBadge[userRole as keyof typeof roleBadge]?.label}
          </Badge>
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No leave notifications</p>
              <p className="text-sm text-muted-foreground mt-2">All requests have been processed.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Pending</span>
              <Badge variant="secondary" className="ml-2">{pendingNotifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Approved</span>
              <Badge variant="secondary" className="ml-2">{approvedNotifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span>Rejected</span>
              <Badge variant="secondary" className="ml-2">{rejectedNotifications.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {pendingNotifications.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No pending notifications</p>
              </Card>
            ) : (
              pendingNotifications.map(notification => (
                <LeaveNotificationCard
                  key={notification.id}
                  notification={notification}
                  onApprove={() => handleApprove(notification.id)}
                  onReject={() => {
                    setSelectedNotifId(notification.id)
                    setShowRejectDialog(true)
                  }}
                  isProcessing={processingId === notification.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4 mt-6">
            {approvedNotifications.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No approved notifications</p>
              </Card>
            ) : (
              approvedNotifications.map(notification => (
                <LeaveNotificationCard
                  key={notification.id}
                  notification={notification}
                  onDismiss={() => handleDismiss(notification.id)}
                  isProcessing={processingId === notification.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4 mt-6">
            {rejectedNotifications.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No rejected notifications</p>
              </Card>
            ) : (
              rejectedNotifications.map(notification => (
                <LeaveNotificationCard
                  key={notification.id}
                  notification={notification}
                  onDismiss={() => handleDismiss(notification.id)}
                  isProcessing={processingId === notification.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this leave request.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={processingId === selectedNotifId}>
              {processingId === selectedNotifId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
