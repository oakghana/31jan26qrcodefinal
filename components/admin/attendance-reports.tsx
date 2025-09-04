"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts"
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface AttendanceRecord {
  id: string
  check_in_time: string
  check_out_time?: string
  work_hours?: number
  status: string
  user_profiles: {
    first_name: string
    last_name: string
    employee_id: string
    departments?: {
      name: string
      code: string
    }
  }
  geofence_locations?: {
    name: string
    address: string
  }
}

interface ReportSummary {
  totalRecords: number
  totalWorkHours: number
  averageWorkHours: number
  statusCounts: Record<string, number>
  departmentStats: Record<string, { count: number; totalHours: number }>
}

const COLORS = ["#4B8B3B", "#8B5CF6", "#6b7280", "#f97316", "#ea580c"]

export function AttendanceReports() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [selectedUser, setSelectedUser] = useState("all")

  const [analyticsData, setAnalyticsData] = useState({
    dailyTrends: [],
    departmentComparison: [],
    lateArrivals: [],
    overtime: [],
    absenteeism: [],
  })

  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchReport()
    fetchDepartments()
    fetchUsers()
  }, [startDate, endDate, selectedDepartment, selectedUser])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      })

      if (selectedDepartment !== "all") params.append("department_id", selectedDepartment)
      if (selectedUser !== "all") params.append("user_id", selectedUser)

      const response = await fetch(`/api/admin/reports/attendance?${params}`)
      const result = await response.json()

      if (result.success) {
        setRecords(result.data.records)
        setSummary(result.data.summary)
      }
    } catch (error) {
      console.error("Failed to fetch report:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments")
      const result = await response.json()
      if (result.success) {
        setDepartments(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch departments:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      const result = await response.json()
      if (result.success) {
        setUsers(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const exportReport = () => {
    const csvContent = [
      ["Date", "Employee ID", "Name", "Department", "Check In", "Check Out", "Work Hours", "Status", "Location"].join(
        ",",
      ),
      ...records.map((record) =>
        [
          new Date(record.check_in_time).toLocaleDateString(),
          record.user_profiles.employee_id,
          `${record.user_profiles.first_name} ${record.user_profiles.last_name}`,
          record.user_profiles.departments?.name || "N/A",
          new Date(record.check_in_time).toLocaleTimeString(),
          record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : "N/A",
          record.work_hours?.toFixed(2) || "N/A",
          record.status,
          record.geofence_locations?.name || "N/A",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-report-${startDate}-to-${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const statusChartData = summary
    ? Object.entries(summary.statusCounts).map(([status, count]) => ({
        name: status.replace("_", " "),
        value: count,
      }))
    : []

  const departmentChartData = summary
    ? Object.entries(summary.departmentStats).map(([dept, stats]) => ({
        name: dept,
        records: stats.count,
        hours: Math.round(stats.totalHours * 100) / 100,
      }))
    : []

  return (
    <div className="space-y-6">
      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Attendance Analytics
          </CardTitle>
          <CardDescription>Comprehensive attendance reports and insights with advanced filtering</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="user">Employee</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={exportReport} variant="outline" className="flex-1 bg-transparent">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={fetchReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{summary.totalRecords}</div>
              <p className="text-xs text-muted-foreground">Attendance entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.statusCounts.present || 0}</div>
              <p className="text-xs text-muted-foreground">On time arrivals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{summary.statusCounts.late || 0}</div>
              <p className="text-xs text-muted-foreground">Late arrivals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{summary.statusCounts.absent || 0}</div>
              <p className="text-xs text-muted-foreground">Absences</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{Math.round(summary.totalWorkHours)}</div>
              <p className="text-xs text-muted-foreground">Work hours logged</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{Object.keys(summary.departmentStats).length}</div>
              <p className="text-xs text-muted-foreground">Active departments</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Analytics with Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance by Department</CardTitle>
                <CardDescription>Total attendance records per department</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="records" fill="#4B8B3B" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Breakdown of attendance statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Attendance Trend</CardTitle>
                <CardDescription>Attendance patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="records" stroke="#4B8B3B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Work Hours Distribution</CardTitle>
                <CardDescription>Average work hours by department</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="hours" stroke="#ea580c" fill="#ea580c" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Detailed breakdown by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(summary?.departmentStats || {}).map(([dept, stats]) => (
                  <div key={dept} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{dept}</h4>
                      <p className="text-sm text-muted-foreground">{stats.count} attendance records</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{Math.round(stats.totalHours)}h</div>
                      <p className="text-sm text-muted-foreground">Total hours</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attendance Records</CardTitle>
              <CardDescription>Complete attendance entries for the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading records...
                        </TableCell>
                      </TableRow>
                    ) : records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No records found for the selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{new Date(record.check_in_time).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {record.user_profiles.first_name} {record.user_profiles.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">{record.user_profiles.employee_id}</div>
                            </div>
                          </TableCell>
                          <TableCell>{record.user_profiles.departments?.name || "N/A"}</TableCell>
                          <TableCell>{new Date(record.check_in_time).toLocaleTimeString()}</TableCell>
                          <TableCell>
                            {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : "N/A"}
                          </TableCell>
                          <TableCell>{record.work_hours?.toFixed(2) || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={record.status === "present" ? "default" : "secondary"}>
                              {record.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.geofence_locations?.name || "N/A"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {records.length > 50 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Showing first 50 records. Export CSV for complete data.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
