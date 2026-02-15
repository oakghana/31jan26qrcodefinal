"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { AlertCircle, Calendar, User, Mail, FileText, Clock, Search } from "lucide-react"
import Image from "next/image"

interface Warning {
  id: string
  recipient_id: string
  recipient_name: string
  recipient_email: string
  department_name: string
  sender_id: string
  sender_role: string
  sender_label: string
  subject: string
  message: string
  warning_type: string
  attendance_date: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

interface WarningsArchiveProps {
  userRole: string
  departmentId?: string
  userId: string
}

export function WarningsArchive({ userRole, departmentId, userId }: WarningsArchiveProps) {
  const [loading, setLoading] = useState(true)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [warningTypeFilter, setWarningTypeFilter] = useState<string>("all")
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetchWarnings()
    fetchDepartments()
  }, [departmentFilter, warningTypeFilter])

  const fetchWarnings = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        ...(departmentFilter !== "all" && { department_id: departmentFilter }),
        ...(warningTypeFilter !== "all" && { warning_type: warningTypeFilter }),
      })

      const response = await fetch(`/api/admin/warnings-archive?${params}`)

      console.log("[v0] Warnings archive response status:", response.status)

      if (!response.ok) {
        let serverMsg = `Failed to fetch warnings archive (status ${response.status})`
        const contentType = response.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          try {
            const errBody = await response.json()
            serverMsg = errBody?.error || JSON.stringify(errBody)
          } catch (e) {
            serverMsg = await response.text()
          }
        } else {
          serverMsg = await response.text()
        }
        console.error("[v0] Warnings archive error:", serverMsg)
        throw new Error(serverMsg)
      }

      const data = await response.json()
      console.log("[v0] Warnings archive data count:", (data.warnings || []).length)
      setWarnings(data.warnings || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load warnings archive")
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/admin/departments")
      if (response.ok) {
        const data = await response.json()
        setDepartments(Array.isArray(data) ? data : data.data || data.departments || [])
      }
    } catch (err) {
      console.error("Error fetching departments:", err)
    }
  }

  const filteredWarnings = warnings.filter((warning) => {
    const matchesSearch =
      warning.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warning.message.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getWarningTypeLabel = (type: string) => {
    switch (type) {
      case "daily_absence":
        return "Daily Absence"
      case "weekly_absence":
        return "Weekly Absence"
      case "repeated_violation":
        return "Repeated Violation"
      case "no_check_in":
        return "No Check-In"
      case "no_check_out":
        return "No Check-Out"
      default:
        return type
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image src="/images/qcc-logo.png" alt="QCC Logo" width={40} height={40} className="rounded-full" />
            <div>
              <CardTitle>Warnings Archive</CardTitle>
              <CardDescription>All formal warnings sent to staff - Total: {warnings.length} warning(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[180px]">
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

            <Select value={warningTypeFilter} onValueChange={setWarningTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="daily_absence">Daily Absence</SelectItem>
                <SelectItem value="weekly_absence">Weekly Absence</SelectItem>
                <SelectItem value="no_check_in">No Check-In</SelectItem>
                <SelectItem value="no_check_out">No Check-Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredWarnings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {searchTerm ? "No warnings found matching your search" : "No warnings have been sent yet"}
            </CardContent>
          </Card>
        ) : (
          filteredWarnings.map((warning) => (
            <Card key={warning.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">{warning.recipient_name}</h4>
                        <Badge variant={warning.is_read ? "secondary" : "default"}>
                          {warning.is_read ? "Read" : "Unread"}
                        </Badge>
                        <Badge variant="outline">{getWarningTypeLabel(warning.warning_type)}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {warning.recipient_email}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {warning.department_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Attendance Date: {new Date(warning.attendance_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="h-4 w-4" />
                        {formatDate(warning.created_at)}
                      </div>
                      <div className="font-medium text-foreground">
                        From: {warning.sender_label || warning.sender_role}
                      </div>
                      {warning.is_read && warning.read_at && (
                        <div className="text-xs">Read: {formatDate(warning.read_at)}</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-start gap-2 mb-2">
                      <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        {warning.subject && <p className="font-medium mb-1">{warning.subject}</p>}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                          {warning.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
