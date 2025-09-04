"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Schedule {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  date: string
  type: "work" | "meeting" | "training" | "break"
  status: "scheduled" | "completed" | "cancelled"
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])

  const [newSchedule, setNewSchedule] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    date: new Date().toISOString().split("T")[0],
    type: "work" as const,
  })

  useEffect(() => {
    fetchSchedules()
  }, [selectedDate])

  const fetchSchedules = async () => {
    try {
      // Mock data for now - replace with actual API call
      const mockSchedules: Schedule[] = [
        {
          id: "1",
          title: "Morning Shift",
          description: "Regular work hours",
          start_time: "08:00",
          end_time: "16:00",
          date: selectedDate,
          type: "work",
          status: "scheduled",
        },
        {
          id: "2",
          title: "Team Meeting",
          description: "Weekly department meeting",
          start_time: "10:00",
          end_time: "11:00",
          date: selectedDate,
          type: "meeting",
          status: "scheduled",
        },
      ]
      setSchedules(mockSchedules)
    } catch (error) {
      setError("Failed to fetch schedules")
    } finally {
      setLoading(false)
    }
  }

  const handleAddSchedule = async () => {
    try {
      // Mock add - replace with actual API call
      const newId = Date.now().toString()
      const schedule: Schedule = {
        ...newSchedule,
        id: newId,
        status: "scheduled",
      }
      setSchedules([...schedules, schedule])
      setIsAddDialogOpen(false)
      setNewSchedule({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        date: new Date().toISOString().split("T")[0],
        type: "work",
      })
    } catch (error) {
      setError("Failed to add schedule")
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "work":
        return "bg-primary"
      case "meeting":
        return "bg-blue-500"
      case "training":
        return "bg-green-500"
      case "break":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Schedule</h1>
            <p className="text-muted-foreground mt-2">Manage your work schedule and appointments</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Schedule</DialogTitle>
                <DialogDescription>Create a new schedule entry</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                    placeholder="Schedule title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newSchedule.description}
                    onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                    placeholder="Schedule description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newSchedule.type}
                    onValueChange={(value: any) => setNewSchedule({ ...newSchedule, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSchedule}>Add Schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule for {new Date(selectedDate).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Label htmlFor="scheduleDate">Select Date:</Label>
              <Input
                id="scheduleDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedule List */}
        <div className="grid gap-4">
          {loading ? (
            <Card>
              <CardContent className="text-center py-8">Loading schedules...</CardContent>
            </Card>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No schedules for this date</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Add Schedule" to create one</p>
              </CardContent>
            </Card>
          ) : (
            schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${getTypeColor(schedule.type)}`}></div>
                      <div>
                        <h3 className="font-semibold">{schedule.title}</h3>
                        <p className="text-sm text-muted-foreground">{schedule.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {schedule.start_time} - {schedule.end_time}
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {schedule.type}
                          </Badge>
                          <Badge variant={schedule.status === "completed" ? "default" : "secondary"}>
                            {schedule.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
