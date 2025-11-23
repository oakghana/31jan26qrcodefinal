"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, CheckCircle2, Clock, UserX, XCircle, Send, Users, TrendingDown, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface StaffAttendance {
  id: string
  first_name: string
  last_name: string
  employee_id: string
  position: string
  check_in_time: string | null
  check_out_time: string | null
  status: "early_checkin" | "no_checkin" | "late_checkin" | "early_checkout" | "no_checkout" | "on_time"
  attendance_record_id?: string
}

interface AttendanceSummary {
  earlyCheckIns: StaffAttendance[]
  noCheckIns: StaffAttendance[]
  earlyCheckouts: StaffAttendance[]
  noCheckouts: StaffAttendance[]
  totalStaff: number
  presentStaff: number
  absentStaff: number
}

interface DepartmentHeadAttendanceModalProps {
  open: boolean
  onClose: () => void
  departmentId: string
  departmentName: string
}

export function DepartmentHeadAttendanceModal({
  open,
  onClose,
  departmentId,
  departmentName,
}: DepartmentHeadAttendanceModalProps) {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set())
  const [warningMessage, setWarningMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingWarnings, setIsSendingWarnings] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open && departmentId) {
      fetchAttendanceSummary()
    }
  }, [open, departmentId])

  const fetchAttendanceSummary = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/department-attendance-summary?departmentId=${departmentId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch attendance summary")
      }

      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error("Error fetching attendance summary:", error)
      toast({
        title: "Error",
        description: "Failed to load attendance summary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStaffSelection = (staffId: string) => {
    const newSelection = new Set(selectedStaff)
    if (newSelection.has(staffId)) {
      newSelection.delete(staffId)
    } else {
      newSelection.add(staffId)
    }
    setSelectedStaff(newSelection)
  }

  const selectAll = (staffList: StaffAttendance[]) => {
    const newSelection = new Set(selectedStaff)
    staffList.forEach((staff) => newSelection.add(staff.id))
    setSelectedStaff(newSelection)
  }

  const sendWarnings = async () => {
    if (selectedStaff.size === 0) {
      toast({
        title: "No staff selected",
        description: "Please select at least one staff member to send warnings.",
        variant: "destructive",
      })
      return
    }

    if (!warningMessage.trim()) {
      toast({
        title: "Warning message required",
        description: "Please enter a warning message before sending.",
        variant: "destructive",
      })
      return
    }

    setIsSendingWarnings(true)
    try {
      const response = await fetch("/api/admin/send-warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffIds: Array.from(selectedStaff),
          message: warningMessage,
          departmentId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send warnings")
      }

      const result = await response.json()

      toast({
        title: "Warnings sent successfully",
        description: `${result.count} warning(s) have been issued and archived.`,
      })

      setSelectedStaff(new Set())
      setWarningMessage("")
      fetchAttendanceSummary()
    } catch (error) {
      console.error("Error sending warnings:", error)
      toast({
        title: "Error",
        description: "Failed to send warnings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingWarnings(false)
    }
  }

  const StaffCard = ({ staff, type }: { staff: StaffAttendance; type: string }) => (
    <Card className="mb-3 border-l-4 border-l-destructive/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selectedStaff.has(staff.id)}
            onCheckedChange={() => toggleStaffSelection(staff.id)}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-foreground">
                  {staff.first_name} {staff.last_name}
                </h4>
                <p className="text-sm text-muted-foreground">{staff.position}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {staff.employee_id}
              </Badge>
            </div>
            {staff.check_in_time && (
              <p className="text-xs text-muted-foreground">
                Check-in: {new Date(staff.check_in_time).toLocaleTimeString()}
              </p>
            )}
            {staff.check_out_time && (
              <p className="text-xs text-muted-foreground">
                Check-out: {new Date(staff.check_out_time).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (!summary && !isLoading) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-background to-background/95">
        <DialogHeader className="space-y-4 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              <Image src="/qcc-logo.jpg" alt="QCC Logo" width={64} height={64} className="rounded-full" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-heading font-bold text-primary">
                {departmentName} Attendance Report
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Today's attendance summary - {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {summary && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-primary">{summary.totalStaff}</div>
                  <div className="text-xs text-muted-foreground">Total Staff</div>
                </CardContent>
              </Card>
              <Card className="border-chart-2/20 bg-gradient-to-br from-chart-2/5 to-chart-2/10">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 text-chart-2 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-chart-2">{summary.presentStaff}</div>
                  <div className="text-xs text-muted-foreground">Present Today</div>
                </CardContent>
              </Card>
              <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10">
                <CardContent className="p-4 text-center">
                  <UserX className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <div className="text-2xl font-bold text-destructive">{summary.absentStaff}</div>
                  <div className="text-xs text-muted-foreground">Absent Today</div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="no_checkin" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="no_checkin" className="flex gap-2">
              <UserX className="h-4 w-4" />
              <span className="hidden sm:inline">No Check-in</span>
              <Badge variant="destructive" className="ml-1">
                {summary?.noCheckIns.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="no_checkout" className="flex gap-2">
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">No Check-out</span>
              <Badge variant="destructive" className="ml-1">
                {summary?.noCheckouts.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="early_checkin" className="flex gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Early In</span>
              <Badge variant="secondary" className="ml-1">
                {summary?.earlyCheckIns.length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="early_checkout" className="flex gap-2">
              <TrendingDown className="h-4 w-4" />
              <span className="hidden sm:inline">Early Out</span>
              <Badge variant="secondary" className="ml-1">
                {summary?.earlyCheckouts.length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="no_checkin" className="mt-0">
                  {summary && summary.noCheckIns.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-muted-foreground">Staff members who did not check in today</p>
                        <Button variant="outline" size="sm" onClick={() => selectAll(summary.noCheckIns)}>
                          Select All
                        </Button>
                      </div>
                      {summary.noCheckIns.map((staff) => (
                        <StaffCard key={staff.id} staff={staff} type="no_checkin" />
                      ))}
                    </>
                  ) : (
                    <Card className="border-chart-2/20 bg-chart-2/5">
                      <CardContent className="p-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-chart-2 mx-auto mb-3" />
                        <p className="font-semibold text-chart-2">All staff checked in!</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Everyone in your department has checked in today.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="no_checkout" className="mt-0">
                  {summary && summary.noCheckouts.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-muted-foreground">Staff members who did not check out today</p>
                        <Button variant="outline" size="sm" onClick={() => selectAll(summary.noCheckouts)}>
                          Select All
                        </Button>
                      </div>
                      {summary.noCheckouts.map((staff) => (
                        <StaffCard key={staff.id} staff={staff} type="no_checkout" />
                      ))}
                    </>
                  ) : (
                    <Card className="border-chart-2/20 bg-chart-2/5">
                      <CardContent className="p-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-chart-2 mx-auto mb-3" />
                        <p className="font-semibold text-chart-2">All staff checked out!</p>
                        <p className="text-sm text-muted-foreground mt-2">Everyone has properly checked out today.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="early_checkin" className="mt-0">
                  {summary && summary.earlyCheckIns.length > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">Staff members who checked in early today</p>
                      {summary.earlyCheckIns.map((staff) => (
                        <StaffCard key={staff.id} staff={staff} type="early_checkin" />
                      ))}
                    </>
                  ) : (
                    <Card className="border-muted">
                      <CardContent className="p-8 text-center">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="font-semibold">No early check-ins</p>
                        <p className="text-sm text-muted-foreground mt-2">No staff checked in early today.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="early_checkout" className="mt-0">
                  {summary && summary.earlyCheckouts.length > 0 ? (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-muted-foreground">Staff members who checked out early today</p>
                        <Button variant="outline" size="sm" onClick={() => selectAll(summary.earlyCheckouts)}>
                          Select All
                        </Button>
                      </div>
                      {summary.earlyCheckouts.map((staff) => (
                        <StaffCard key={staff.id} staff={staff} type="early_checkout" />
                      ))}
                    </>
                  ) : (
                    <Card className="border-muted">
                      <CardContent className="p-8 text-center">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="font-semibold">No early checkouts</p>
                        <p className="text-sm text-muted-foreground mt-2">No staff left early today.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>

        {selectedStaff.size > 0 && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>{selectedStaff.size} staff member(s) selected</span>
            </div>
            <Textarea
              placeholder="Enter warning message (required)..."
              value={warningMessage}
              onChange={(e) => setWarningMessage(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={sendWarnings}
                disabled={isSendingWarnings || !warningMessage.trim()}
                className="flex-1 bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive shadow-lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSendingWarnings ? "Sending..." : "Send Warning Notice"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedStaff(new Set())
                  setWarningMessage("")
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
