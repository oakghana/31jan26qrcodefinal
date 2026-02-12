import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { LeaveManagementClient } from "@/components/leave/leave-management-client"

export default async function LeaveManagementPage() {
  return (
    <DashboardLayout>
      <LeaveManagementClient />
    </DashboardLayout>
  )
}

  const [userDepartment, setUserDepartment] = useState<string | null>(null)
  const [staffRequests, setStaffRequests] = useState<LeaveRequest[]>([])
  const [managerNotifications, setManagerNotifications] = useState<LeaveNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [newLeaveOpen, setNewLeaveOpen] = useState(false)
  const [dismissalReason, setDismissalReason] = useState("")
  const supabase = createClient()

  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    leave_type: "annual",
    reason: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
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
      setUserDepartment(profile.department_id)

      // Fetch staff's own leave requests
      if (["staff"].includes(profile.role)) {
        const { data: requests } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        setStaffRequests(requests || [])
      }

      // Fetch pending notifications for managers
      if (["admin", "regional_manager", "department_head"].includes(profile.role)) {
        let query = supabase
          .from("leave_notifications")
          .select("*, leave_requests(*)")
          .eq("status", "pending")

        if (profile.role === "department_head") {
          // Department heads see requests from their department staff
          query = query.not("status", "eq", "dismissed")
        } else if (profile.role === "regional_manager") {
          // Regional managers see all pending requests
          query = query.not("status", "eq", "dismissed")
        }
        // Admin sees all

        const { data: notifications } = await query.order("created_at", { ascending: false })
        setManagerNotifications(notifications || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitLeave = async () => {
    if (!formData.start_date || !formData.end_date || !formData.reason) {
      alert("Please fill in all required fields")
      return
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      alert("End date must be after start date")
      return
    }

    setSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const response = await fetch("/api/leave/request-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason,
          leave_type: formData.leave_type,
        }),
      })

      if (response.ok) {
        setFormData({ start_date: "", end_date: "", leave_type: "annual", reason: "" })
        setNewLeaveOpen(false)
        await fetchData()
        alert("Leave request submitted successfully!")
      }
    } catch (error) {
      console.error("Error submitting leave:", error)
      alert("Failed to submit leave request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (notificationId: string) => {
    setProcessingId(notificationId)
    try {
      const response = await fetch("/api/leave/approve-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: notificationId,
          action: "approve",
        }),
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error("Error approving leave:", error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDismiss = async (notificationId: string, reason: string) => {
    setProcessingId(notificationId)
    try {
      const response = await fetch("/api/leave/approve-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_id: notificationId,
          action: "dismiss",
          reason: reason || "Request dismissed",
        }),
      })

      if (response.ok) {
        await fetchData()
        setDismissalReason("")
      }
    } catch (error) {
      console.error("Error dismissing leave:", error)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading leave management...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const pendingRequests = staffRequests.filter((r) => r.status === "pending")
  const approvedRequests = staffRequests.filter((r) => r.status === "approved")
  const pendingNotifications = managerNotifications.filter((n) => n.status === "pending")

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight">Leave Management</h1>
                <p className="text-lg text-muted-foreground font-medium mt-1">
                  {["staff"].includes(userRole || "")
                    ? "Request and track your leave"
                    : "Manage leave requests from your team"}
                </p>
              </div>
            </div>

            {["staff"].includes(userRole || "") && (
              <Dialog open={newLeaveOpen} onOpenChange={setNewLeaveOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Request Leave
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Leave</DialogTitle>
                    <DialogDescription>
                      Submit a new leave request for approval by your manager
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="leave_type">Leave Type</Label>
                      <Select value={formData.leave_type} onValueChange={(value) => setFormData({ ...formData, leave_type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Annual Leave</SelectItem>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="maternity">Maternity Leave</SelectItem>
                          <SelectItem value="paternity">Paternity Leave</SelectItem>
                          <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="reason">Reason</Label>
                      <Textarea
                        id="reason"
                        placeholder="Provide a reason for your leave request..."
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        rows={4}
                      />
                    </div>

                    <Button onClick={handleSubmitLeave} disabled={submitting} className="w-full gap-2">
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {["staff"].includes(userRole || "") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{pendingRequests.length}</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Approved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{approvedRequests.length}</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Total Requested
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{staffRequests.length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {["admin", "regional_manager", "department_head"].includes(userRole || "") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Pending Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{pendingNotifications.length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue={["staff"].includes(userRole || "") ? "my-requests" : "pending-approvals"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            {["staff"].includes(userRole || "") ? (
              <>
                <TabsTrigger value="my-requests">My Requests ({staffRequests.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({approvedRequests.length})</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="pending-approvals">Pending ({pendingNotifications.length})</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </>
            )}
          </TabsList>

          {["staff"].includes(userRole || "") && (
            <>
              <TabsContent value="my-requests" className="space-y-4">
                {staffRequests.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground mb-4">No leave requests yet</p>
                      <Button onClick={() => setNewLeaveOpen(true)}>Request Leave</Button>
                    </CardContent>
                  </Card>
                ) : (
                  staffRequests.map((request) => (
                    <Card key={request.id} className={`border-2 ${
                      request.status === "pending"
                        ? "border-amber-200"
                        : request.status === "approved"
                          ? "border-green-200"
                          : "border-red-200"
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)} Leave</CardTitle>
                            <CardDescription>{request.reason}</CardDescription>
                          </div>
                          <Badge
                            variant={
                              request.status === "pending"
                                ? "outline"
                                : request.status === "approved"
                                  ? "default"
                                  : "destructive"
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                            <p className="font-semibold">{format(new Date(request.start_date), "MMM dd, yyyy")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">End Date</p>
                            <p className="font-semibold">{format(new Date(request.end_date), "MMM dd, yyyy")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4">
                {approvedRequests.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No approved leaves</p>
                    </CardContent>
                  </Card>
                ) : (
                  approvedRequests.map((request) => (
                    <Card key={request.id} className="border-2 border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)} Leave</CardTitle>
                        <CardDescription>{request.reason}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                            <p className="font-semibold">{format(new Date(request.start_date), "MMM dd, yyyy")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">End Date</p>
                            <p className="font-semibold">{format(new Date(request.end_date), "MMM dd, yyyy")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </>
          )}

          {["admin", "regional_manager", "department_head"].includes(userRole || "") && (
            <>
              <TabsContent value="pending-approvals" className="space-y-4">
                {pendingNotifications.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-muted-foreground">No pending leave requests to approve</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingNotifications.map((notification) => {
                    const leave = notification.leave_requests
                    return (
                      <Card key={notification.id} className="border-2 border-amber-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>{leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave Request</CardTitle>
                              <CardDescription>{leave.reason}</CardDescription>
                            </div>
                            <Badge variant="outline">Pending Review</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                              <p className="font-semibold">{format(new Date(leave.start_date), "MMM dd, yyyy")}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">End Date</p>
                              <p className="font-semibold">{format(new Date(leave.end_date), "MMM dd, yyyy")}</p>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-4 border-t">
                            <Button
                              onClick={() => handleApprove(notification.id)}
                              disabled={processingId === notification.id}
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                            >
                              {processingId === notification.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleDismiss(notification.id, "Request dismissed by manager")}
                              disabled={processingId === notification.id}
                              size="sm"
                              variant="destructive"
                              className="flex-1 gap-2"
                            >
                              {processingId === notification.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4" />
                                  Dismiss
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Historical leave request data would appear here</AlertDescription>
                </Alert>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
