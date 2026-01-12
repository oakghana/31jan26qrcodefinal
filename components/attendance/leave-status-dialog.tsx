"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Briefcase, Upload, X, FileText } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface LeaveStatusDialogProps {
  currentStatus: string
  onStatusChange: () => void
}

export function LeaveStatusDialog({ currentStatus, onStatusChange }: LeaveStatusDialogProps) {
  const [open, setOpen] = useState(false)
  const [leaveType, setLeaveType] = useState<"active" | "on_leave" | "sick_leave">("active")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 5MB.",
          variant: "destructive",
        })
        return
      }

      // Validate file type (images and PDFs only)
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"]
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image (JPG, PNG) or PDF document.",
          variant: "destructive",
        })
        return
      }

      setUploadedFile(file)
    }
  }

  const handleSubmit = async () => {
    if (leaveType !== "active" && (!startDate || !endDate)) {
      toast({
        title: "Missing Information",
        description: "Please select start and end dates for your leave period.",
        variant: "destructive",
      })
      return
    }

    if (leaveType !== "active" && endDate && startDate && endDate < startDate) {
      toast({
        title: "Invalid Dates",
        description: "End date must be after start date.",
        variant: "destructive",
      })
      return
    }

    if (leaveType === "sick_leave" && !uploadedFile) {
      toast({
        title: "Document Required",
        description: "Please upload medical evidence for sick leave.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let fileUrl = null
      if (uploadedFile) {
        setIsUploading(true)
        const formData = new FormData()
        formData.append("file", uploadedFile)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload document")
        }

        const uploadResult = await uploadResponse.json()
        fileUrl = uploadResult.url
        setIsUploading(false)
      }

      const response = await fetch("/api/attendance/leave-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_status: leaveType,
          leave_start_date: startDate?.toISOString().split("T")[0],
          leave_end_date: endDate?.toISOString().split("T")[0],
          leave_reason: reason || null,
          leave_document_url: fileUrl,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update leave status")
      }

      toast({
        title: "Leave Status Updated",
        description:
          leaveType === "active"
            ? "You are now marked as active and can check in/out."
            : `Your ${leaveType === "on_leave" ? "leave" : "sick leave"} has been recorded. You will not be expected to check in during this period.`,
      })

      setOpen(false)
      onStatusChange()
      setUploadedFile(null)
      setReason("")
      setStartDate(undefined)
      setEndDate(undefined)
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update leave status",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Briefcase className="h-4 w-4" />
          {currentStatus === "active" ? "Indicate Leave" : "Update Leave Status"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Leave Status</DialogTitle>
          <DialogDescription>
            Mark yourself as on leave or sick. During this period, you will not be able to check in/out and will not
            receive attendance notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Status</Label>
            <RadioGroup value={leaveType} onValueChange={(value: any) => setLeaveType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="font-normal cursor-pointer">
                  Active (Working)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="on_leave" id="on_leave" />
                <Label htmlFor="on_leave" className="font-normal cursor-pointer">
                  On Leave
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sick_leave" id="sick_leave" />
                <Label htmlFor="sick_leave" className="font-normal cursor-pointer">
                  Sick Leave
                </Label>
              </div>
            </RadioGroup>
          </div>

          {leaveType !== "active" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Brief reason for your leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">
                  {leaveType === "sick_leave" ? "Medical Document (Required)" : "Supporting Document (Optional)"}
                </Label>
                <div className="space-y-2">
                  {uploadedFile ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{uploadedFile.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(uploadedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        id="fileInput"
                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="fileInput" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium mb-1">Click to upload document</p>
                        <p className="text-xs text-muted-foreground">
                          {leaveType === "sick_leave"
                            ? "Medical certificate or doctor's note"
                            : "Leave letter or supporting document"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG or PDF (max 5MB)</p>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting || isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
            {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading..." : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
