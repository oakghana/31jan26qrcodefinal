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
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  const handleLocationSelect = (location: GeofenceLocation) => {
    setLocationCode(location.location_code || "")
    setSelectedLocationId(location.id)
    setError(null)
  }

  const handleSubmitCode = async () => {
    if (!locationCode.trim()) {
      setError("Please enter a location code")
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/locations/lookup?code=${encodeURIComponent(locationCode.trim())}`)
      const data = await response.json()

      if (!response.ok || data.error) {
        setError(data.message || "No active location found with this code. Please check the code and try again.")
        setIsProcessing(false)
        return
      }

      setSelectedLocationId(data.location.id)

      if (canCheckIn && !isCheckedIn) {
        await handleManualCheckIn(data.location)
      } else if (canCheckOut && isCheckedIn) {
        await handleManualCheckOut(data.location)
      }

      setLocationCode("")
      setError(null)
      setSelectedLocationId(null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process location code")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualCheckIn = async (location: { id: string; name: string; latitude: number; longitude: number }) => {
    try {
      const locationData = userLocation || { latitude: location.latitude, longitude: location.longitude, accuracy: 0 }

      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: location.id,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy || 0,
          check_in_method: "manual_code",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Check-in failed")
      }

      await onCheckIn()
    } catch (err) {
      throw err
    }
  }

  const handleManualCheckOut = async (location: { id: string; name: string; latitude: number; longitude: number }) => {
    try {
      const locationData = userLocation || { latitude: location.latitude, longitude: location.longitude, accuracy: 0 }

      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: location.id,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy || 0,
          check_out_method: "manual_code",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Check-out failed")
      }

      await onCheckOut()
    } catch (err) {
      throw err
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manual Location Code Entry</DialogTitle>
          <DialogDescription>Enter your location code or select from the list below</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Enter Location Code</label>
              <div className="flex gap-2">
                <Input
                  value={locationCode}
                  onChange={(e) => {
                    setLocationCode(e.target.value.toUpperCase())
                    setSelectedLocationId(null)
                  }}
                  placeholder="Enter code (e.g., ACCRA, NSAWAM)"
                  className="uppercase"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && locationCode.trim()) {
                      handleSubmitCode()
                    }
                  }}
                  disabled={isProcessing}
                />
                <Button onClick={handleSubmitCode} disabled={isProcessing || !locationCode.trim()}>
                  {isProcessing ? "Submitting..." : "Submit Code"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Code is printed on your location QR poster or ask your supervisor
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Or Select from Nearby Locations</p>
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {location.location_code ? `Code: ${location.location_code}` : "No code set"}
                        </p>
                      </div>
                      {distance !== null && (
                        <Badge variant={distance < location.radius_meters ? "default" : "outline"} className="ml-2">
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
