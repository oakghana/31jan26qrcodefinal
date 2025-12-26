"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Download, TrendingUp, Users, AlertTriangle, ArrowLeft } from "lucide-react"
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
          <CardDescription>Detailed breakdown by employee</CardDescription>
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
                  <TableRow key={summary.userId}>
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
    </div>
  )
}
