"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import { calculateDistance } from "@/lib/geolocation"
import type { LocationData } from "@/lib/geolocation"

interface GeofenceLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meters: number
  location_code?: string
}

interface LocationCodeDialogProps {
  open: boolean
  onClose: () => void
  locations: GeofenceLocation[]
  userLocation: LocationData | null
  onCheckIn: () => void
  onCheckOut: () => void
  canCheckIn: boolean
  canCheckOut: boolean
  isCheckedIn: boolean
}

export function LocationCodeDialog({
  open,
  onClose,
  locations,
  userLocation,
  onCheckIn,
  onCheckOut,
  canCheckIn,
  canCheckOut,
  isCheckedIn,
}: LocationCodeDialogProps) {
  const [locationCode, setLocationCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmitCode = async () => {
    if (!locationCode.trim()) {
      setError("Please enter a location code")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Find location by code
      const location = locations.find((loc) => loc.location_code?.toUpperCase() === locationCode.trim().toUpperCase())

      if (!location) {
        setError("No active location found with this code. Please check the code and try again.")
        setIsProcessing(false)
        return
      }

      // Call the appropriate action
      if (canCheckIn && !isCheckedIn) {
        await onCheckIn()
      } else if (canCheckOut && isCheckedIn) {
        await onCheckOut()
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process location code")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLocationSelect = async (location: GeofenceLocation) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Set the location code and trigger submission
      setLocationCode(location.location_code || location.name)

      // Call the appropriate action
      if (canCheckIn && !isCheckedIn) {
        await onCheckIn()
      } else if (canCheckOut && isCheckedIn) {
        await onCheckOut()
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process location")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Location Code Check-In</DialogTitle>
          <DialogDescription>Enter location code from your work site or scan QR code</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Recommended Method */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">✓</span>
              </div>
              <p className="text-sm font-semibold">RECOMMENDED: Enter Location Code (Fastest Method)</p>
            </div>
          </div>

          {/* Manual Code Entry */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Location Code</label>
              <div className="flex gap-2">
                <Input
                  value={locationCode}
                  onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
                  placeholder="Enter code (e.g., ACCRA, NSAWAM)"
                  className="uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmitCode()
                    }
                  }}
                />
                <Button onClick={handleSubmitCode} disabled={isProcessing || !locationCode.trim()}>
                  {isProcessing ? "Processing..." : "Submit Code"}
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Select Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Quick Select Location</p>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {locations.map((location) => {
                const distance = userLocation
                  ? calculateDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      location.latitude,
                      location.longitude,
                    )
                  : null

                return (
                  <button
                    key={location.id}
                    onClick={() => handleLocationSelect(location)}
                    disabled={isProcessing}
                    className="w-full p-3 text-left border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{location.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{location.location_code || "No code"}</p>
                      </div>
                      {distance !== null && (
                        <Badge variant="outline" className="ml-2">
                          {distance < 1000 ? `${distance.toFixed(0)}m` : `${(distance / 1000).toFixed(1)}km`}
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
