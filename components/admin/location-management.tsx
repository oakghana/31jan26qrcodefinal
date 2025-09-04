"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MapPin, Plus, QrCode, Edit } from "lucide-react"
import { generateQRCode, generateSignature, type QRCodeData } from "@/lib/qr-code"

interface GeofenceLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meters: number
  is_active: boolean
  qr_code?: string
}

export function LocationManagement() {
  const [locations, setLocations] = useState<GeofenceLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingLocation, setIsAddingLocation] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<GeofenceLocation | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)

  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    radius_meters: "100",
  })

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/admin/locations")
      if (!response.ok) throw new Error("Failed to fetch locations")
      const data = await response.json()
      setLocations(data)
    } catch (err) {
      setError("Failed to load locations")
    } finally {
      setLoading(false)
    }
  }

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLocation,
          latitude: Number.parseFloat(newLocation.latitude),
          longitude: Number.parseFloat(newLocation.longitude),
          radius_meters: Number.parseInt(newLocation.radius_meters),
        }),
      })

      if (!response.ok) throw new Error("Failed to add location")

      await fetchLocations()
      setIsAddingLocation(false)
      setNewLocation({ name: "", address: "", latitude: "", longitude: "", radius_meters: "100" })
    } catch (err) {
      setError("Failed to add location")
    } finally {
      setLoading(false)
    }
  }

  const generateLocationQR = async (location: GeofenceLocation) => {
    try {
      const timestamp = Date.now()
      const qrData: QRCodeData = {
        type: "location",
        locationId: location.id,
        timestamp,
        signature: generateSignature(location.id, timestamp),
      }

      const qrCodeDataUrl = await generateQRCode(qrData)
      setQrCodeUrl(qrCodeDataUrl)
      setSelectedLocation(location)
    } catch (err) {
      setError("Failed to generate QR code")
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewLocation((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          }))
        },
        () => {
          setError("Failed to get current location")
        },
      )
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading locations...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Location Management</h2>
          <p className="text-muted-foreground">Manage geofence locations and QR codes</p>
        </div>
        <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Location</DialogTitle>
              <DialogDescription>Create a new geofence location for attendance tracking</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddLocation} className="space-y-4">
              <div>
                <Label htmlFor="name">Location Name</Label>
                <Input
                  id="name"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Campus"
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={newLocation.latitude}
                    onChange={(e) => setNewLocation((prev) => ({ ...prev, latitude: e.target.value }))}
                    placeholder="25.2854"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={newLocation.longitude}
                    onChange={(e) => setNewLocation((prev) => ({ ...prev, longitude: e.target.value }))}
                    placeholder="51.5310"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="radius">Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={newLocation.radius_meters}
                  onChange={(e) => setNewLocation((prev) => ({ ...prev, radius_meters: e.target.value }))}
                  placeholder="100"
                  required
                />
              </div>
              <Button type="button" variant="outline" onClick={getCurrentLocation} className="w-full bg-transparent">
                <MapPin className="h-4 w-4 mr-2" />
                Use Current Location
              </Button>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  Add Location
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddingLocation(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <Card key={location.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{location.name}</CardTitle>
                <Badge variant={location.is_active ? "default" : "secondary"}>
                  {location.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <CardDescription>{location.address}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Lat: {location.latitude}</div>
                <div>Lng: {location.longitude}</div>
                <div>Radius: {location.radius_meters}m</div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => generateLocationQR(location)}>
                  <QrCode className="h-4 w-4 mr-1" />
                  QR Code
                </Button>
                <Button size="sm" variant="outline">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QR Code Display Dialog */}
      <Dialog open={!!qrCodeUrl} onOpenChange={() => setQrCodeUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Location QR Code</DialogTitle>
            <DialogDescription>QR code for {selectedLocation?.name}</DialogDescription>
          </DialogHeader>
          {qrCodeUrl && (
            <div className="text-center space-y-4">
              <img src={qrCodeUrl || "/placeholder.svg"} alt="Location QR Code" className="mx-auto" />
              <p className="text-sm text-muted-foreground">Staff can scan this QR code to check in at this location</p>
              <Button
                onClick={() => {
                  const link = document.createElement("a")
                  link.download = `${selectedLocation?.name}-qr-code.png`
                  link.href = qrCodeUrl
                  link.click()
                }}
              >
                Download QR Code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
