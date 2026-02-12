"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  CalendarIcon,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  MapPin,
  Loader2,
  Filter,
  TrendingUp,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface AttendanceRecord {
  id: string
  check_in_time: string
  check_out_time?: string
  work_hours?: number
  status: string
  check_in_location_name?: string
  check_out_location_name?: string
  is_check_in_outside_location?: boolean
  is_check_out_outside_location?: boolean
  early_checkout_reason?: string
  user_profiles: {
    first_name: string
    last_name: string
    employee_id: string
    departments?: { name: string; code: string }
    assigned_location?: { name: string; address: string }
    districts?: { name: string }
  }
  check_in_location?: { name: string; address: string }
  check_out_location?: { name: string; address: string }
  geofence_locations?: { name: string; address: string }
}

interface ReportSummary {
  totalRecords: number
  totalWorkHours: number
  averageWorkHours: number
  statusCounts: Record<string, number>
  departmentStats: Record<string, { count: number; totalHours: number }>
}

const COLORS = ["#4B8B3B", "#8B5CF6", "#6b7280", "#f97316", "#ea580c"]

// Stat card sub-component
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  color?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${color || "bg-primary/10"}`}>
        <Icon className={`h-4 w-4 ${color ? "text-card" : "text-primary"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold leading-tight text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{sub}</p>
      </div>
    </div>
  )
}

export function AttendanceReports() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return date.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0])
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [selectedUser, setSelectedUser] = useState("all")
  const [locations, setLocations] = useState<{ id: string; name: string; address: string }[]>([])
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([])
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [selectedDistrict, setSelectedDistrict] = useState("all")
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setExportError(null)
    try {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
      if (selectedDepartment !== "all") params.append("department_id", selectedDepartment)
      if (selectedUser !== "all") params.append("user_id", selectedUser)
      if (selectedLocation !== "all") params.append("location_id", selectedLocation)
      if (selectedDistrict !== "all") params.append("district_id", selectedDistrict)

      const response = await fetch(`/api/admin/reports/attendance?${params}`)
      const result = await response.json()
      if (result.success) {
        setRecords(result.data.records || [])
        setSummary(result.data.summary || null)
      } else {
        setExportError(result.error || "Failed to fetch report data")
      }
    } catch {
      setExportError("Failed to fetch report data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, selectedDepartment, selectedUser, selectedLocation, selectedDistrict])

  useEffect(() => {
    fetchReport()
    // fetch auxiliary data
    const fetchAux = async () => {
      const supabase = createClient()
      const [deptRes, usersRes, locRes, distRes] = await Promise.all([
        fetch("/api/admin/departments"),
        fetch("/api/admin/users"),
        supabase.from("geofence_locations").select("id, name, address").eq("is_active", true).order("name"),
        supabase.from("districts").select("id, name").eq("is_active", true).order("name"),
      ])
      const deptData = await deptRes.json()
      const usersData = await usersRes.json()
      if (deptData.success) setDepartments(deptData.data || [])
      if (usersData.success) setUsers(usersData.data || [])
      if (!locRes.error) setLocations(locRes.data || [])
      if (!distRes.error) setDistricts(distRes.data || [])
    }
    fetchAux()
  }, [fetchReport])

  const exportReport = async (format: "excel" | "csv") => {
    setExporting(true)
    setExportError(null)
    try {
      if (format === "csv") {
        const csvContent = [
          ["Date", "Employee ID", "Name", "Department", "Assigned Location", "Check In Time", "Check In Location", "Check In Status", "Check Out Time", "Check Out Location", "Check Out Status", "Early Checkout Reason", "Work Hours", "Status", "Location Status"].join(","),
          ...records.map((r) =>
            [
              new Date(r.check_in_time).toLocaleDateString(),
              `"${r.user_profiles.employee_id || "N/A"}"`,
              `"${r.user_profiles.first_name} ${r.user_profiles.last_name}"`,
              `"${r.user_profiles.departments?.name || "N/A"}"`,
              `"${r.user_profiles.assigned_location?.name || "N/A"}"`,
              `"${new Date(r.check_in_time).toLocaleTimeString()}"`,
              `"${r.check_in_location?.name || r.check_in_location_name || "N/A"}"`,
              `"${r.is_check_in_outside_location ? "Outside" : "On-site"}"`,
              `"${r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : "N/A"}"`,
              `"${r.check_out_location?.name || r.check_out_location_name || "N/A"}"`,
              `"${r.is_check_out_outside_location ? "Outside" : "On-site"}"`,
              `"${r.early_checkout_reason || "-"}"`,
              r.work_hours?.toFixed(2) || "0",
              `"${r.status}"`,
              `"${r.is_check_in_outside_location || r.is_check_out_outside_location ? "Remote" : "On-site"}"`,
            ].join(","),
          ),
        ].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `attendance-report-${startDate}-to-${endDate}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        const response = await fetch("/api/admin/reports/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            format,
            data: records,
            summary,
            filters: {
              startDate,
              endDate,
              locationId: selectedLocation !== "all" ? selectedLocation : null,
              districtId: selectedDistrict !== "all" ? selectedDistrict : null,
              departmentId: selectedDepartment !== "all" ? selectedDepartment : null,
              userId: selectedUser !== "all" ? selectedUser : null,
              reportType: "attendance",
            },
          }),
        })
        clearTimeout(timeoutId)
        if (!response.ok) throw new Error(`Export failed: ${response.status}`)
        const blob = await response.blob()
        if (blob.size === 0) throw new Error("Export returned empty file")
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `attendance-report-${startDate}-to-${endDate}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error: unknown) {
      const err = error as Error & { name?: string }
      if (err.name === "AbortError") {
        setExportError("Export timed out. Try a smaller date range.")
      } else {
        setExportError(`Export failed: ${err.message}`)
      }
    } finally {
      setExporting(false)
    }
  }

  const statusChartData = useMemo(
    () =>
      summary?.statusCounts
        ? Object.entries(summary.statusCounts).map(([status, count]) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: count,
          }))
        : [],
    [summary?.statusCounts],
  )

  const departmentChartData = useMemo(
    () =>
      summary?.departmentStats
        ? Object.entries(summary.departmentStats).map(([dept, stats]) => ({
            name: dept.length > 12 ? dept.slice(0, 12) + "..." : dept,
            count: stats.count,
            hours: stats.totalHours,
          }))
        : [],
    [summary?.departmentStats],
  )

  const filteredRecords = useMemo(() => {
    let filtered = records
    if (selectedDepartment !== "all") filtered = filtered.filter((r) => r.user_profiles?.departments?.name === selectedDepartment)
    if (selectedUser !== "all") filtered = filtered.filter((r) => r.user_profiles?.employee_id === selectedUser)
    if (selectedLocation !== "all") filtered = filtered.filter((r) => r.check_in_location?.name === selectedLocation || r.check_out_location?.name === selectedLocation)
    if (selectedDistrict !== "all") filtered = filtered.filter((r) => r.user_profiles?.districts?.name === selectedDistrict)
    return filtered
  }, [records, selectedDepartment, selectedUser, selectedLocation, selectedDistrict])

  const presentCount = useMemo(() => records.filter((r) => r.status === "present" || r.check_in_time).length, [records])

  const setQuickDate = (preset: "today" | "week" | "month" | "quarter") => {
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]
    switch (preset) {
      case "today":
        setStartDate(todayStr)
        setEndDate(todayStr)
        break
      case "week": {
        const ws = new Date(today)
        ws.setDate(today.getDate() - today.getDay())
        setStartDate(ws.toISOString().split("T")[0])
        setEndDate(todayStr)
        break
      }
      case "month":
        setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0])
        setEndDate(todayStr)
        break
      case "quarter":
        setStartDate(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1).toISOString().split("T")[0])
        setEndDate(todayStr)
        break
    }
  }

  return (
    <div className="space-y-3">
      {/* Header row with title, quick dates, exports */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Reports & Analytics</h1>
            <p className="text-xs text-muted-foreground">Attendance reports with export</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["today", "week", "month", "quarter"] as const).map((p) => (
            <Button key={p} size="sm" variant="outline" onClick={() => setQuickDate(p)} className="h-7 px-2.5 text-xs">
              {p === "today" ? "Today" : p === "week" ? "Week" : p === "month" ? "Month" : "Quarter"}
            </Button>
          ))}
          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />
          <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-7 px-2.5 text-xs gap-1">
            <Filter className="h-3 w-3" />
            Filters
          </Button>
        </div>
      </div>

      {/* Collapsible filter bar */}
      {showFilters && (
        <Card className="border-dashed">
          <CardContent className="p-3">
            {exportError && (
              <Alert variant="destructive" className="mb-2 py-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs">{exportError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
              <div>
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Start</Label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">End</Label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Location</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">District</Label>
                <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Dept</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Depts</SelectItem>
                    {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Employee</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchReport} size="sm" className="h-8 w-full text-xs" disabled={loading}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                  <span className="ml-1">{loading ? "..." : "Go"}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards row */}
      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Locations" value={locations.length} sub="Active" icon={MapPin} />
          <StatCard label="Records" value={summary.totalRecords} sub="Total entries" icon={FileText} />
          <StatCard label="Present" value={presentCount} sub="On time" icon={CheckCircle} color="bg-primary" />
          <StatCard label="Late" value={summary.statusCounts.late || 0} sub="Arrivals" icon={AlertTriangle} color="bg-accent" />
          <StatCard label="Hours" value={Math.round(summary.totalWorkHours)} sub="Work logged" icon={Clock} />
          <StatCard label="Depts" value={Object.keys(summary.departmentStats).length} sub="Active" icon={Users} />
        </div>
      )}

      {/* Export bar */}
      {records.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{records.length} records</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportReport("excel")}
            disabled={exporting}
            className="h-7 text-xs gap-1"
          >
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSpreadsheet className="h-3 w-3" />}
            Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportReport("csv")}
            disabled={exporting}
            className="h-7 text-xs gap-1"
          >
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            CSV
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && records.length === 0 && (
        <Alert className="py-2">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">No records found. Adjust filters or date range.</AlertDescription>
        </Alert>
      )}

      {/* Tabs: charts + details */}
      <Tabs defaultValue="overview" className="space-y-2">
        <TabsList className="h-8 p-0.5">
          <TabsTrigger value="overview" className="h-7 text-xs px-3 gap-1"><BarChart3 className="h-3 w-3" />Overview</TabsTrigger>
          <TabsTrigger value="trends" className="h-7 text-xs px-3 gap-1"><TrendingUp className="h-3 w-3" />Trends</TabsTrigger>
          <TabsTrigger value="departments" className="h-7 text-xs px-3 gap-1"><Users className="h-3 w-3" />Depts</TabsTrigger>
          <TabsTrigger value="details" className="h-7 text-xs px-3 gap-1"><FileText className="h-3 w-3" />Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">By Department</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={departmentChartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">Status Split</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      innerRadius={35}
                      fill="#8884d8"
                      dataKey="value"
                      strokeWidth={2}
                    >
                      {statusChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-0 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">Attendance Trend</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={departmentChartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">Work Hours</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={departmentChartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="hours" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="mt-0">
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm">Department Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="divide-y divide-border">
                {Object.entries(summary?.departmentStats || {}).map(([dept, stats]) => (
                  <div key={dept} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{dept}</p>
                      <p className="text-[10px] text-muted-foreground">{stats.count} records</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{Math.round(stats.totalHours)}h</p>
                      <p className="text-[10px] text-muted-foreground">total</p>
                    </div>
                  </div>
                ))}
                {!summary?.departmentStats || Object.keys(summary.departmentStats).length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No department data</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-0">
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] h-8 px-2">Date</TableHead>
                      <TableHead className="text-[10px] h-8 px-2">Employee</TableHead>
                      <TableHead className="text-[10px] h-8 px-2">Dept</TableHead>
                      <TableHead className="text-[10px] h-8 px-2">In</TableHead>
                      <TableHead className="text-[10px] h-8 px-2">In Location</TableHead>
                      <TableHead className="text-[10px] h-8 px-2">Out</TableHead>
                      <TableHead className="text-[10px] h-8 px-2">Out Location</TableHead>
                      <TableHead className="text-[10px] h-8 px-2">Hrs</TableHead>
                      <TableHead className="text-[10px] h-8 px-2">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-6 text-xs text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRecords.map((record) => (
                        <TableRow key={record.id} className="text-xs">
                          <TableCell className="px-2 py-1.5 whitespace-nowrap">{new Date(record.check_in_time).toLocaleDateString()}</TableCell>
                          <TableCell className="px-2 py-1.5">
                            <span className="font-medium">{record.user_profiles.first_name} {record.user_profiles.last_name}</span>
                            <span className="block text-[10px] text-muted-foreground">{record.user_profiles.employee_id}</span>
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-muted-foreground">{record.user_profiles.departments?.name || "-"}</TableCell>
                          <TableCell className="px-2 py-1.5 whitespace-nowrap">{new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell className="px-2 py-1.5">
                            <span>{record.check_in_location?.name || record.check_in_location_name || "-"}</span>
                            {record.is_check_in_outside_location && (
                              <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 text-accent border-accent/30">{" "}Remote</Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 whitespace-nowrap">
                            {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            <span>{record.check_out_location?.name || record.check_out_location_name || "-"}</span>
                            {record.is_check_out_outside_location && (
                              <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 text-accent border-accent/30">{" "}Remote</Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 font-medium">{record.work_hours?.toFixed(1) || "0"}</TableCell>
                          <TableCell className="px-2 py-1.5">
                            <Badge variant={record.status === "present" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {record.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {records.length > 50 && (
                <p className="text-[10px] text-muted-foreground p-2 border-t border-border">
                  Showing first 50. Export for complete data.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
