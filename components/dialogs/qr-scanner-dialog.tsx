"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

interface QRScannerDialogProps {
  open: boolean
  onClose: () => void
  mode: "checkin" | "checkout" | null
  userLocation: unknown
}

export function QRScannerDialog({ open, onClose }: QRScannerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Feature Not Available</DialogTitle>
          <DialogDescription>QR code scanning is not enabled for this system.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Please use GPS-based check-in/check-out from the Attendance page. Ensure location services are enabled on your device.
            </p>
          </div>
          <Button onClick={onClose} variant="outline" className="w-full bg-transparent">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
