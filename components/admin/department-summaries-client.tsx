"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Calendar,
  Download,
  TrendingUp,
  Users,
  AlertTriangle,
  ArrowLeft,
  Clock,
  LogIn,
  LogOut,
  User,
} from "lucide-react"
import Link from "next/link"

interface Summary {
  userId: string
  name: string
  email: string
  employeeId: string
  department: string
  daysWorked: number
  daysAbsent: number
  totalWorkHours: string
  daysOnTime: number
  daysLate: number
  attendanceRate: string
  status: string
  hasCheckedOutToday: boolean
}

interface DepartmentSummariesClientProps {
  userRole: string
  departmentId?: string
}

export function DepartmentSummariesClient({ userRole, departmentId }: DepartmentSummariesClientProps) {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("weekly")
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [totalStaff, setTotalStaff] = useState(0)

  const [selectedStaff, setSelectedStaff] = useState<Summary | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchSummaries()
  }, [period])

  const fetchSummaries = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/department-summaries?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setSummaries(data.summaries)
        setDateRange({ start: data.startDate, end: data.endDate })
        setTotalStaff(data.totalStaff)
      }
    } catch (error) {
      console.error("Error fetching summaries:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent":
        return <Badge className="bg-green-500">Excellent</Badge>
      case "good":
        return <Badge className="bg-blue-500">Good</Badge>
      default:
        return <Badge className="bg-orange-500">Needs Attention</Badge>
    }
  }

  const handleStaffClick = (summary: Summary) => {
    setSelectedStaff(summary)
    setShowDetailModal(true)
  }

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Employee ID",
      "Department",
      "Days Worked",
      "Days Absent",
      "Total Hours",
      "On Time",
      "Late",
      "Attendance Rate",
      "Status",
    ]
    const rows = summaries.map((s) => [
      s.name,
      s.employeeId,
      s.department,
      s.daysWorked,
      s.daysAbsent,
      s.totalWorkHours,
      s.daysOnTime,
      s.daysLate,
      `${s.attendanceRate}%`,
      s.status,
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `department-summary-${period}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  // Calculate overall statistics
  const totalDaysWorked = summaries.reduce((sum, s) => sum + s.daysWorked, 0)
  const totalAbsences = summaries.reduce((sum, s) => sum + s.daysAbsent, 0)
  const avgAttendanceRate =
    summaries.length > 0
      ? (summaries.reduce((sum, s) => sum + Number.parseFloat(s.attendanceRate), 0) / summaries.length).toFixed(1)
      : "0.0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Department Attendance Summaries</h1>
            <p className="text-muted-foreground">
              {dateRange.start &&
                `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{totalStaff}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Attendance</p>
                <p className="text-2xl font-bold">{avgAttendanceRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Days Worked</p>
                <p className="text-2xl font-bold">{totalDaysWorked}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Absences</p>
                <p className="text-2xl font-bold">{totalAbsences}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Attendance Details</CardTitle>
          <CardDescription>Click on any staff member to view detailed summary</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : summaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No data available for this period</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Days Worked</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">On Time</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Total Hours</TableHead>
                  <TableHead className="text-center">Attendance Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => (
                  <TableRow
                    key={summary.userId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleStaffClick(summary)}
                  >
                    <TableCell className="font-medium">{summary.name}</TableCell>
                    <TableCell>{summary.employeeId}</TableCell>
                    <TableCell>{summary.department}</TableCell>
                    <TableCell className="text-center">{summary.daysWorked}</TableCell>
                    <TableCell className="text-center">
                      <span className={summary.daysAbsent > 0 ? "text-orange-600 font-semibold" : ""}>
                        {summary.daysAbsent}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-green-600">{summary.daysOnTime}</TableCell>
                    <TableCell className="text-center">
                      <span className={summary.daysLate > 0 ? "text-orange-600 font-semibold" : ""}>
                        {summary.daysLate}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{summary.totalWorkHours}h</TableCell>
                    <TableCell className="text-center">{summary.attendanceRate}%</TableCell>
                    <TableCell>{getStatusBadge(summary.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Staff Attendance Summary
              </DialogTitle>
              <DialogDescription>
                {dateRange.start &&
                  `${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Staff Member</p>
                  <p className="text-2xl font-bold">{selectedStaff.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedStaff.email}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Employee ID:</span> {selectedStaff.employeeId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Department:</span> {selectedStaff.department}
                  </p>
                </div>
                {getStatusBadge(selectedStaff.status)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Calendar className="h-5 w-5 text-green-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-green-600">{selectedStaff.daysWorked}</div>
                      <p className="text-xs text-muted-foreground mt-1">Days Worked</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Clock className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-blue-600">{selectedStaff.totalWorkHours}h</div>
                      <p className="text-xs text-muted-foreground mt-1">Total Hours</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-purple-600">{selectedStaff.attendanceRate}%</div>
                      <p className="text-xs text-muted-foreground mt-1">Attendance Rate</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <LogIn className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-emerald-600">{selectedStaff.daysOnTime}</div>
                      <p className="text-xs text-muted-foreground mt-1">On Time</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <LogOut className="h-5 w-5 text-orange-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-orange-600">{selectedStaff.daysLate}</div>
                      <p className="text-xs text-muted-foreground mt-1">Late Arrivals</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-red-600">{selectedStaff.daysAbsent}</div>
                      <p className="text-xs text-muted-foreground mt-1">Days Absent</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedStaff.daysAbsent > 0 && (
                <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-orange-900">Attendance Alert</p>
                    <p className="text-sm text-orange-700">
                      This staff member was absent {selectedStaff.daysAbsent} day(s) during this period
                    </p>
                  </div>
                </div>
              )}

              {selectedStaff.status === "excellent" && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Excellent Performance</p>
                    <p className="text-sm text-green-700">This staff member has maintained excellent attendance</p>
                  </div>
                </div>
              )}

              <Button onClick={() => setShowDetailModal(false)} className="w-full">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
