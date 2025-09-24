"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  getCurrentLocation,
  validateAttendanceLocation,
  requestLocationPermission,
  calculateDistance,
  type LocationData,
  type ProximitySettings,
} from "@/lib/geolocation"
import { getDeviceInfo } from "@/lib/device-info"
import { QRScanner } from "@/components/qr/qr-scanner"
import { validateQRCode, type QRCodeData } from "@/lib/qr-code"
import {
  MapPin,
  Clock,
  CheckCircle,
  Loader2,
  AlertTriangle,
  QrCode,
  Navigation,
  Wifi,
  WifiOff,
  Building,
} from "lucide-react"
import { useRealTimeLocations } from "@/hooks/use-real-time-locations"
import { createClient } from "@/lib/supabase/client"

interface GeofenceLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius_meters: number
}

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  employee_id: string
  position: string
  assigned_location_id?: string
  departments?: {
    name: string
    code: string
  }
}

interface AssignedLocationInfo {
  location: GeofenceLocation
  distance?: number
  isAtAssignedLocation: boolean
}

interface AttendanceRecorderProps {
  todayAttendance?: {
    id: string
    check_in_time: string
    check_out_time?: string
    work_hours?: number
    check_in_location_name?: string
    check_out_location_name?: string
    is_remote_location?: boolean
    different_checkout_location?: boolean
  } | null
}

export function AttendanceRecorder({ todayAttendance }: AttendanceRecorderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<LocationData | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [assignedLocationInfo, setAssignedLocationInfo] = useState<AssignedLocationInfo | null>(null)
  const { locations, loading: locationsLoading, error: locationsError, isConnected } = useRealTimeLocations()
  const [proximitySettings, setProximitySettings] = useState<ProximitySettings>({
    checkInProximityRange: 500,
    defaultRadius: 20,
    requireHighAccuracy: true,
    allowManualOverride: false,
  })
  const [locationValidation, setLocationValidation] = useState<{
    canCheckIn: boolean
    nearestLocation?: GeofenceLocation
    distance?: number
    message: string
    accuracyWarning?: string
    allLocations?: { location: GeofenceLocation; distance: number }[]
    availableLocations?: { location: GeofenceLocation; distance: number }[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrScanMode, setQrScanMode] = useState<"checkin" | "checkout">("checkin")
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<{
    granted: boolean | null
    message: string
  }>({ granted: null, message: "" })
  const [showLocationHelp, setShowLocationHelp] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState<string>("")
  const [showLocationSelector, setShowLocationSelector] = useState(false)

  useEffect(() => {
    fetchUserProfile()
    loadProximitySettings()
  }, [])

  const loadProximitySettings = async () => {
    try {
      const response = await fetch("/api/settings")
      if (response.ok) {
        const data = await response.json()
        if (data.systemSettings?.geo_settings) {
          const geoSettings = data.systemSettings.geo_settings
          setProximitySettings({
            checkInProximityRange: Number.parseInt(geoSettings.checkInProximityRange) || 500,
            defaultRadius: Number.parseInt(geoSettings.defaultRadius) || 20,
            requireHighAccuracy: geoSettings.requireHighAccuracy ?? true,
            allowManualOverride: geoSettings.allowManualOverride ?? false,
          })
          console.log("[v0] Loaded proximity settings:", {
            checkInProximityRange: Number.parseInt(geoSettings.checkInProximityRange) || 500,
            defaultRadius: Number.parseInt(geoSettings.defaultRadius) || 20,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Failed to load proximity settings:", error)
      // Keep default settings if loading fails
    }
  }

  useEffect(() => {
    if (userLocation && locations.length > 0 && userProfile?.assigned_location_id) {
      const assignedLocation = locations.find((loc) => loc.id === userProfile.assigned_location_id)
      if (assignedLocation) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          assignedLocation.latitude,
          assignedLocation.longitude,
        )
        const isAtAssignedLocation = distance <= assignedLocation.radius_meters

        setAssignedLocationInfo({
          location: assignedLocation,
          distance: Math.round(distance),
          isAtAssignedLocation,
        })

        console.log("[v0] Assigned location info:", {
          name: assignedLocation.name,
          distance: Math.round(distance),
          isAtAssignedLocation,
          radius: assignedLocation.radius_meters,
        })
      }
    }
  }, [userLocation, locations, userProfile])

  useEffect(() => {
    if (userLocation && locations.length > 0) {
      console.log(
        "[v0] All available locations:",
        locations.map((l) => ({
          name: l.name,
          address: l.address,
          lat: l.latitude,
          lng: l.longitude,
          radius: l.radius_meters,
        })),
      )

      console.log("[v0] User location:", {
        lat: userLocation.latitude,
        lng: userLocation.longitude,
        accuracy: userLocation.accuracy,
      })

      const locationDistances = locations
        .map((location) => {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            location.latitude,
            location.longitude,
          )
          return {
            location,
            distance: Math.round(distance),
          }
        })
        .sort((a, b) => a.distance - b.distance)

      console.log("[v0] Distance to each location:", locationDistances)

      const validation = validateAttendanceLocation(userLocation, locations, proximitySettings)
      console.log("[v0] Location validation result:", validation)
      console.log(
        "[v0] Locations data:",
        locations.map((l) => ({ name: l.name, radius: l.radius_meters })),
      )
      console.log("[v0] Validation message:", validation.message)
      console.log("[v0] Can check in:", validation.canCheckIn)
      console.log("[v0] Distance:", validation.distance)
      console.log("[v0] Nearest location being checked:", validation.nearestLocation?.name)
      console.log("[v0] Using proximity range:", proximitySettings.checkInProximityRange)
      setLocationValidation({ ...validation, allLocations: locationDistances })
    }
  }, [userLocation, locations, proximitySettings])

  useEffect(() => {
    if (locationsError) {
      setError(`Location data error: ${locationsError}`)
    }
  }, [locationsError])

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profileData, error } = await supabase
          .from("user_profiles")
          .select(`
            id,
            first_name,
            last_name,
            employee_id,
            position,
            assigned_location_id,
            departments (
              name,
              code
            )
          `)
          .eq("id", user.id)
          .single()

        if (error) {
          console.error("[v0] Failed to fetch user profile:", error)
          return
        }

        setUserProfile(profileData)
        console.log("[v0] User profile loaded:", {
          name: `${profileData.first_name} ${profileData.last_name}`,
          employee_id: profileData.employee_id,
          position: profileData.position,
          assigned_location_id: profileData.assigned_location_id,
          department: profileData.departments?.name,
        })
      }
    } catch (error) {
      console.error("[v0] Error fetching user profile:", error)
    }
  }

  const getCurrentLocationData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const location = await getCurrentLocation()
      setUserLocation(location)
      setLocationPermissionStatus({ granted: true, message: "Location access granted" })
      return location
    } catch (error) {
      if (error instanceof Error && error.message.includes("Location access denied")) {
        setLocationPermissionStatus({
          granted: false,
          message: error.message,
        })
        setShowLocationHelp(true)
      }
      const message = error instanceof Error ? error.message : "Failed to get location"
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckIn = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const location = await getCurrentLocation()
      setUserLocation(location)

      if (!locationValidation?.canCheckIn) {
        setError(`You must be within ${proximitySettings.checkInProximityRange}m of a QCC location to check in`)
        setIsLoading(false)
        return
      }

      if (
        !selectedLocationId &&
        locationValidation.availableLocations &&
        locationValidation.availableLocations.length > 0
      ) {
        setShowLocationSelector(true)
        setIsLoading(false)
        return
      }

      const targetLocationId = selectedLocationId || locationValidation.availableLocations?.[0]?.location.id
      const targetLocation = locations.find((loc) => loc.id === targetLocationId)

      if (!targetLocation) {
        setError(`No location available for check-in within ${proximitySettings.checkInProximityRange}m range`)
        setIsLoading(false)
        return
      }

      const deviceInfo = getDeviceInfo()

      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          location_id: targetLocation.id,
          device_info: deviceInfo,
        }),
      })

      const result = await response.json()

      if (result.success) {
        const locationInfo = result.data.location_tracking
        let message = result.message

        if (locationInfo?.is_remote_location) {
          message += " (Note: This is different from your assigned location)"
        }

        setSuccess(message)
        setSelectedLocationId("") // Reset selection
        window.location.reload()
      } else {
        setError(result.error || "Failed to check in")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check in"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      let location = null
      let nearestLocation = null

      try {
        location = await getCurrentLocation()
        setUserLocation(location)
        console.log("[v0] Location acquired for check-out:", location)

        if (locations.length > 1) {
          const locationDistances = locations
            .map((loc) => {
              const distance = calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude)
              return { location: loc, distance: Math.round(distance) }
            })
            .sort((a, b) => a.distance - b.distance)

          setLocationValidation((prev) => ({
            ...prev,
            availableLocations: locationDistances,
          }))

          if (!selectedLocationId) {
            setShowLocationSelector(true)
            setIsLoading(false)
            return
          }

          nearestLocation = locations.find((loc) => loc.id === selectedLocationId)
        } else {
          const nearest = findNearestLocation(location, locations)
          nearestLocation = nearest?.location || locations[0]
        }
      } catch (locationError) {
        console.log("[v0] Location unavailable for check-out, proceeding without GPS:", locationError)

        if (locations.length > 1 && !selectedLocationId) {
          setLocationValidation((prev) => ({
            ...prev,
            availableLocations: locations.map((loc) => ({ location: loc, distance: 0 })),
          }))
          setShowLocationSelector(true)
          setIsLoading(false)
          return
        }

        nearestLocation = selectedLocationId ? locations.find((loc) => loc.id === selectedLocationId) : locations[0] // Use first available location as fallback
      }

      console.log("[v0] Attempting check-out with location:", nearestLocation?.name)

      const requestBody = {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        location_id: nearestLocation?.id || null,
      }

      console.log("[v0] Check-out request body:", requestBody)

      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()
      console.log("[v0] Check-out response:", result)

      if (result.success) {
        setSuccess(result.message)
        setSelectedLocationId("") // Reset selection
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setError(result.error || "Failed to check out")
      }
    } catch (error) {
      console.error("[v0] Check-out error:", error)
      const message = error instanceof Error ? error.message : "Failed to check out"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQRCheckIn = async (qrData: QRCodeData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setShowQRScanner(false)

    try {
      const validation = validateQRCode(qrData)
      if (!validation.isValid) {
        setError(validation.reason || "Invalid QR code")
        return
      }

      const location = locations.find((loc) => loc.id === qrData.locationId)
      if (!location) {
        setError("Location not found")
        return
      }

      const deviceInfo = getDeviceInfo()

      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_id: location.id,
          device_info: deviceInfo,
          qr_code_used: true,
          qr_timestamp: qrData.timestamp,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        window.location.reload()
      } else {
        setError(result.error || "Failed to check in with QR code")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check in with QR code"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQRCheckOut = async (qrData: QRCodeData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setShowQRScanner(false)

    try {
      const validation = validateQRCode(qrData)
      if (!validation.isValid) {
        setError(validation.reason || "Invalid QR code")
        return
      }

      const location = locations.find((loc) => loc.id === qrData.locationId)
      if (!location) {
        setError("Location not found")
        return
      }

      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location_id: location.id,
          qr_code_used: true,
          qr_timestamp: qrData.timestamp,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess(result.message)
        window.location.reload()
      } else {
        setError(result.error || "Failed to check out")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to check out"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequestLocationPermission = async () => {
    setIsLoading(true)
    setError(null)

    const result = await requestLocationPermission()
    setLocationPermissionStatus(result)

    if (result.granted) {
      setShowLocationHelp(false)
      await getCurrentLocationData()
    } else {
      setError(result.message)
      setShowLocationHelp(true)
    }

    setIsLoading(false)
  }

  const handleRefreshLocations = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const timestamp = Date.now()
      const response = await fetch(`/api/attendance/user-location?refresh=${timestamp}`, {
        cache: "no-store",
      })

      if (response.ok) {
        // Trigger a page reload to ensure all data is fresh
        window.location.reload()
      } else {
        const result = await response.json()
        if (response.status === 403) {
          setError("Location access restricted. Please contact your administrator.")
        } else {
          setError(result.error || "Failed to refresh location data")
        }
      }
    } catch (error) {
      setError("Failed to refresh location data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId)
    setShowLocationSelector(false)
    // Automatically proceed with check-in
    setTimeout(() => {
      handleCheckIn()
    }, 100)
  }

  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time
  const isCheckedOut = todayAttendance?.check_out_time
  const canCheckIn = !todayAttendance?.check_in_time
  const canCheckOut = isCheckedIn

  const findNearestLocation = (userLocation: LocationData, locations: GeofenceLocation[]) => {
    // Placeholder for finding nearest location logic
    return { location: locations[0] }
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Status
          </CardTitle>
          <CardDescription>Your current attendance status for today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <Badge variant={isCheckedOut ? "default" : isCheckedIn ? "secondary" : "outline"}>
              {isCheckedOut ? "Completed" : isCheckedIn ? "Checked In" : "Not Checked In"}
            </Badge>
          </div>

          {todayAttendance?.check_in_time && (
            <div className="flex items-center justify-between">
              <span>Check-in Time:</span>
              <span className="font-medium">{new Date(todayAttendance.check_in_time).toLocaleTimeString()}</span>
            </div>
          )}

          {todayAttendance?.check_in_location_name && (
            <div className="flex items-center justify-between">
              <span>Check-in Location:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{todayAttendance.check_in_location_name}</span>
                {todayAttendance.is_remote_location && (
                  <Badge variant="outline" className="text-xs">
                    <Navigation className="h-3 w-3 mr-1" />
                    Remote
                  </Badge>
                )}
              </div>
            </div>
          )}

          {todayAttendance?.check_out_time && (
            <div className="flex items-center justify-between">
              <span>Check-out Time:</span>
              <span className="font-medium">{new Date(todayAttendance.check_out_time).toLocaleTimeString()}</span>
            </div>
          )}

          {todayAttendance?.check_out_location_name && (
            <div className="flex items-center justify-between">
              <span>Check-out Location:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{todayAttendance.check_out_location_name}</span>
                {todayAttendance.different_checkout_location && (
                  <Badge variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" />
                    Different
                  </Badge>
                )}
              </div>
            </div>
          )}

          {todayAttendance?.work_hours && (
            <div className="flex items-center justify-between">
              <span>Work Hours:</span>
              <span className="font-medium">{todayAttendance.work_hours.toFixed(2)} hours</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Status
            <div className="flex items-center gap-1 ml-auto">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-600 text-xs">
                  <Wifi className="h-3 w-3" />
                  <span>Live Updates</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-600 text-xs">
                  <WifiOff className="h-3 w-3" />
                  <span>Offline</span>
                </div>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Your current location relative to QCC Stations/Locations ({proximitySettings.checkInProximityRange}m
            proximity required for check-in)
            <br />
            Check-in requires being within {proximitySettings.checkInProximityRange}m of any QCC location. Check-out can
            be done from anywhere within the company. Location data updates automatically when admins make changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userProfile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Your Assignment Information
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Employee:</span>
                  <span className="font-medium text-blue-900">
                    {userProfile.first_name} {userProfile.last_name} ({userProfile.employee_id})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Position:</span>
                  <span className="font-medium text-blue-900">{userProfile.position}</span>
                </div>
                {userProfile.departments && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Department:</span>
                    <span className="font-medium text-blue-900">{userProfile.departments.name}</span>
                  </div>
                )}
                {assignedLocationInfo ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Assigned Location:</span>
                      <span className="font-medium text-blue-900">{assignedLocationInfo.location.name}</span>
                    </div>
                    {assignedLocationInfo.distance !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-blue-700">Distance to Assignment:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-900">{assignedLocationInfo.distance}m</span>
                          {assignedLocationInfo.isAtAssignedLocation ? (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              At Assigned Location
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                              Remote Location
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : userProfile.assigned_location_id ? (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Assigned Location:</span>
                    <span className="font-medium text-blue-900">Loading...</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Assigned Location:</span>
                    <span className="font-medium text-orange-600">Not assigned</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {locationsLoading && locations.length === 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading location data...</span>
            </div>
          ) : !userLocation ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={getCurrentLocationData}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1 bg-transparent"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Get Current Location
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRefreshLocations}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  title="Refresh location data"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>

              {showLocationHelp && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <div className="font-medium">Location Access Required</div>
                    <div className="text-sm whitespace-pre-line">{locationPermissionStatus.message}</div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={handleRequestLocationPermission} disabled={isLoading}>
                        Try Again
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLocationHelp(false)}
                        className="bg-transparent"
                      >
                        Use QR Code Instead
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Location acquired</span>
              </div>

              {locationValidation?.accuracyWarning && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{locationValidation.accuracyWarning}</AlertDescription>
                </Alert>
              )}

              {locationValidation && (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium mb-2">Available QCC Locations:</div>
                    <div className="space-y-2">
                      {locationValidation.allLocations?.slice(0, 5).map(({ location, distance }) => (
                        <div
                          key={location.id}
                          className="flex items-center justify-between p-2 bg-background rounded border"
                        >
                          <div>
                            <div className="font-medium text-sm">{location.name}</div>
                            <div className="text-xs text-muted-foreground">{location.address}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{distance}m</div>
                            {distance <= proximitySettings.checkInProximityRange ? (
                              <Badge variant="secondary" className="text-xs">
                                Available
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Too Far
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {locationValidation.allLocations && locationValidation.allLocations.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{locationValidation.allLocations.length - 5} more locations available
                        </div>
                      )}
                    </div>
                  </div>

                  {locationValidation.canCheckIn ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">{locationValidation.message}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-600">{locationValidation.message}</span>
                    </div>
                  )}

                  {canCheckOut && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Check-out allowed from any location</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Selector Dialog */}
      <Dialog open={showLocationSelector} onOpenChange={setShowLocationSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {canCheckIn && !isCheckedIn ? "Select Check-in Location" : "Select Check-out Location"}
            </DialogTitle>
            <DialogDescription>
              {locationValidation?.availableLocations && locationValidation.availableLocations.length > 0
                ? `Choose from ${locationValidation.availableLocations.length} available QCC location${locationValidation.availableLocations.length > 1 ? "s" : ""}`
                : "Choose which QCC location to use for attendance"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {locationValidation?.availableLocations?.map(({ location, distance }) => (
                <div
                  key={location.id}
                  onClick={() => handleLocationSelect(location.id)}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{location.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{location.address}</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-medium">{distance}m</div>
                    {distance <= proximitySettings.checkInProximityRange ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    ) : canCheckOut ? (
                      <Badge variant="outline" className="text-xs">
                        <Navigation className="h-3 w-3 mr-1" />
                        Checkout OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Too Far
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
              {canCheckIn && !isCheckedIn
                ? `💡 Check-in requires being within ${proximitySettings.checkInProximityRange}m of a location`
                : "💡 Check-out can be done from any QCC location"}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLocationSelector(false)
                  setSelectedLocationId("")
                }}
                className="flex-1 bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Record your attendance at any registered QCC location using GPS or QR code
            {!userLocation && " - QR code works without location access"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {/* GPS Check-in/out buttons */}
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                onClick={handleCheckIn}
                disabled={!canCheckIn || !locationValidation?.canCheckIn || isLoading}
                className="h-12"
                size="lg"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                GPS Check In
              </Button>

              <Button
                onClick={handleCheckOut}
                disabled={!canCheckOut || isLoading}
                variant="outline"
                className="h-12 bg-transparent"
                size="lg"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                Check Out (Any Location)
              </Button>
            </div>

            {/* QR code check-in/out buttons */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or use QR Code</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Dialog
                open={showQRScanner && qrScanMode === "checkin"}
                onOpenChange={(open) => {
                  setShowQRScanner(open)
                  if (open) setQrScanMode("checkin")
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    disabled={!canCheckIn || isLoading}
                    variant="outline"
                    className="h-12 bg-transparent"
                    size="lg"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Check In
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Check In with QR Code</DialogTitle>
                    <DialogDescription>Scan the location QR code to check in at any QCC location</DialogDescription>
                  </DialogHeader>
                  <QRScanner onScanSuccess={handleQRCheckIn} onClose={() => setShowQRScanner(false)} />
                </DialogContent>
              </Dialog>

              <Dialog
                open={showQRScanner && qrScanMode === "checkout"}
                onOpenChange={(open) => {
                  setShowQRScanner(open)
                  if (open) setQrScanMode("checkout")
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    disabled={!canCheckOut || isLoading}
                    variant="outline"
                    className="h-12 bg-transparent"
                    size="lg"
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Check Out
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Check Out with QR Code</DialogTitle>
                    <DialogDescription>Scan the location QR code to check out</DialogDescription>
                  </DialogHeader>
                  <QRScanner onScanSuccess={handleQRCheckOut} onClose={() => setShowQRScanner(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {!canCheckIn && !canCheckOut && (
            <p className="text-sm text-muted-foreground text-center">You have completed your attendance for today.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
