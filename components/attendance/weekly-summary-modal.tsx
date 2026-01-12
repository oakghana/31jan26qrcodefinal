"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, Award, AlertTriangle, LogIn, LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface WeeklySummary {
  weekStart: string
  weekEnd: string
  userName: string
  daysWorked: number
  totalWorkHours: string
  daysOnTime: number
  daysLate: number
  daysAbsent: number
  earlyCheckouts: number
  totalCheckIns: number
  totalCheckOuts: number
  performance: string
}

export function WeeklySummaryModal() {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const today = new Date()
    const isFriday = today.getDay() === 5
    const lastShown = localStorage.getItem("lastWeeklySummaryShown")
    const todayStr = today.toISOString().split("T")[0]

    console.log("[v0] Checking weekly summary: isFriday=", isFriday, "lastShown=", lastShown, "today=", todayStr)

    if (isFriday && lastShown !== todayStr) {
      fetchSummary()
    }
  }, [])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      console.log("[v0] Fetching weekly summary...")
      const response = await fetch("/api/attendance/weekly-summary")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Weekly summary data:", data)
        setSummary(data)
        setOpen(true)
        localStorage.setItem("lastWeeklySummaryShown", new Date().toISOString().split("T")[0])
      } else {
        console.error("[v0] Failed to fetch weekly summary:", response.status)
      }
    } catch (error) {
      console.error("[v0] Error fetching weekly summary:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceBadge = (performance: string) => {
    switch (performance) {
      case "excellent":
        return <Badge className="bg-green-500 text-white">⭐ Excellent</Badge>
      case "good":
        return <Badge className="bg-blue-500 text-white">👍 Good</Badge>
      case "fair":
        return <Badge className="bg-yellow-500 text-white">⚠️ Fair</Badge>
      default:
        return <Badge className="bg-red-500 text-white">📉 Needs Improvement</Badge>
    }
  }

  if (!summary) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Your Weekly Attendance Summary
          </DialogTitle>
          <DialogDescription>
            Week of {new Date(summary.weekStart).toLocaleDateString()} -{" "}
            {new Date(summary.weekEnd).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Overall Performance</p>
              <p className="text-2xl font-bold">{summary.userName}</p>
            </div>
            {getPerformanceBadge(summary.performance)}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{summary.daysWorked}</div>
                  <p className="text-xs text-muted-foreground mt-1">Days Worked</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{summary.totalWorkHours}h</div>
                  <p className="text-xs text-muted-foreground mt-1">Total Hours</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">{summary.daysOnTime}</div>
                  <p className="text-xs text-muted-foreground mt-1">On Time</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{summary.daysLate}</div>
                  <p className="text-xs text-muted-foreground mt-1">Late Arrivals</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <LogIn className="h-4 w-4 text-primary" />
                    <div className="text-3xl font-bold text-primary">{summary.totalCheckIns}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Check-Ins</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <LogOut className="h-4 w-4 text-purple-600" />
                    <div className="text-3xl font-bold text-purple-600">{summary.totalCheckOuts}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Check-Outs</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {summary.daysAbsent > 0 && (
            <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">Absent Days: {summary.daysAbsent}</p>
                <p className="text-sm text-orange-700">You were absent {summary.daysAbsent} day(s) last week</p>
              </div>
            </div>
          )}

          {summary.earlyCheckouts > 0 && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">Early Checkouts: {summary.earlyCheckouts}</p>
                <p className="text-sm text-blue-700">You checked out early {summary.earlyCheckouts} time(s)</p>
              </div>
            </div>
          )}

          {summary.performance === "excellent" && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Award className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Great Work!</p>
                <p className="text-sm text-green-700">Keep up the excellent attendance record!</p>
              </div>
            </div>
          )}

          <Button onClick={() => setOpen(false)} className="w-full">
            Got it, thanks!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
