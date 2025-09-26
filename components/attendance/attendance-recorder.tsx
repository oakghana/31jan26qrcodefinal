"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  getCurrentLocation,
  validateAttendanceLocation,
  validateCheckoutLocation,
  requestLocationPermission,
  calculateDistance,
  type LocationData,
  type ProximitySettings,
} from "@/lib/geolocation"
import { getDeviceInfo } from "@/lib/device-info"
import { validateQRCode, type QRCodeData } from "@/lib/qr-code"
import { MapPin, Clock, CheckCircle, Loader2, AlertTriangle, Navigation, Wifi, WifiOff, Building } from "lucide-react"
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
    checkInProximityRange: 50,
    defaultRadius: 20,
    requireHighAccuracy: true,
    allowManualOverride: false,
  })
  const [locationValidation, setLocationValidation] = useState<{
    canCheckIn: boolean
    canCheckOut?: boolean
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

  useEffect(() => {
    fetchUserProfile()
    loadProximitySettings()
  }, [])

  useEffect(() => {
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
            checkInProximityRange: Number.parseInt(geoSettings.checkInProximityRange) || 50,
            defaultRadius: Number.parseInt(geoSettings.defaultRadius) || 20,
            requireHighAccuracy: geoSettings.requireHighAccuracy ?? true,
            allowManualOverride: geoSettings.allowManualOverride ?? false,
          })
          console.log("[v0] Loaded proximity settings:", {
            checkInProximityRange: Number.parseInt(geoSettings.checkInProximityRange) || 50,
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
      const checkoutValidation = validateCheckoutLocation(userLocation, locations, proximitySettings)

      console.log("[v0] Location validation result:", validation)
      console.log("[v0] Check-out validation result:", checkoutValidation)
      console.log(
        "[v0] Locations data:",
        locations.map((l) => ({ name: l.name, radius: l.radius_meters })),
      )
      console.log("[v0] Validation message:", validation.message)
      console.log("[v0] Can check in:", validation.canCheckIn)
      console.log("[v0] Can check out:", checkoutValidation.canCheckOut)
      console.log("[v0] Distance:", validation.distance)
      console.log("[v0] Nearest location being checked:", validation.nearestLocation?.name)
      console.log("[v0] Using proximity range:", proximitySettings.checkInProximityRange)

      setLocationValidation({
        ...validation,
        canCheckOut: checkoutValidation.canCheckOut,
        allLocations: locationDistances,
      })
    }
  }, [userLocation, locations, proximitySettings])

  const fetchUserProfile = async () => {
    try {
      console.log("[v0] Fetching user profile...")
      const supabase = createClient()

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log("[v0] No authenticated user found")
          return
        }

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
      } catch (authError) {
        console.error("[v0] Supabase auth error:", authError)
        // Don't set error state for auth issues in preview environment
        if (!window.location.hostname.includes("vusercontent.net")) {
          setError("Authentication error. Please refresh the page.")
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching user profile:", error)
      // Only show error in production environment
      if (!window.location.hostname.includes("vusercontent.net")) {
        setError("Failed to load user profile. Please refresh the page.")
      }
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

      let targetLocationId = null

      // First priority: Use user's assigned location if they're within range
      if (userProfile?.assigned_location_id && assignedLocationInfo?.isAtAssignedLocation) {
        targetLocationId = userProfile.assigned_location_id
        console.log("[v0] Using assigned location for check-in:", assignedLocationInfo.location.name)
      }
      // Second priority: Use the nearest available location
      else if (locationValidation.availableLocations && locationValidation.availableLocations.length > 0) {
        targetLocationId = locationValidation.availableLocations[0].location.id
        console.log(
          "[v0] Using nearest available location for check-in:",
          locationValidation.availableLocations[0].location.name,
        )
      }

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

        const checkoutValidation = validateCheckoutLocation(location, locations, proximitySettings)

        if (!checkoutValidation.canCheckOut) {
          setError(
            `Check-out requires being within ${proximitySettings.checkInProximityRange}m of any QCC location. ${checkoutValidation.message}`,
          )
          setIsLoading(false)
          return
        }

        if (locations.length > 1) {
          const locationDistances = locations
            .map((loc) => {
              const distance = calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude)
              return { location: loc, distance: Math.round(distance) }
            })
            .sort((a, b) => a.distance - b.distance)
            .filter(({ distance }) => distance <= proximitySettings.checkInProximityRange)

          setLocationValidation((prev) => ({
            ...prev,
            availableLocations: locationDistances,
          }))

          if (locationDistances.length === 0) {
            setError(`No QCC locations within ${proximitySettings.checkInProximityRange}m range for check-out`)
            setIsLoading(false)
            return
          }

          if (userProfile?.assigned_location_id && assignedLocationInfo?.isAtAssignedLocation) {
            nearestLocation = locations.find((loc) => loc.id === userProfile.assigned_location_id)
            console.log("[v0] Using assigned location for check-out:", nearestLocation?.name)
          } else {
            nearestLocation = locationDistances[0]?.location
            console.log("[v0] Using nearest location for check-out:", nearestLocation?.name)
          }
        } else {
          const nearest = findNearestLocation(location, locations)
          nearestLocation = nearest?.location || locations[0]
        }
      } catch (locationError) {
        console.log("[v0] Location unavailable for check-out, showing location selector:", locationError)
        setError("Location is required for check-out. Please enable GPS or use a QR code.")
        setIsLoading(false)
        return
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

  const isCheckedIn = todayAttendance?.check_in_time && !todayAttendance?.check_out_time
  const isCheckedOut = todayAttendance?.check_out_time
  const canCheckIn = !todayAttendance?.check_in_time
  const canCheckOut = isCheckedIn

  const findNearestLocation = (userLocation: LocationData, locations: GeofenceLocation[]) => {
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
            be done from anywhere within 50m of the company. Location data updates automatically when admins make
            changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userProfile && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg">
              <div className="font-medium text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Your Assignment Information
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Employee:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {userProfile.first_name} {userProfile.last_name} ({userProfile.employee_id})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-300">Position:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">{userProfile.position}</span>
                </div>
                {userProfile.departments && (
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">Department:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">
                      {userProfile.departments.name}
                    </span>
                  </div>
                )}
                {assignedLocationInfo ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-300">Assigned Location:</span>
                      <span className="font-medium text-green-900 dark:text-green-100">
                        {assignedLocationInfo.location.name}
                      </span>
                    </div>
                    {assignedLocationInfo.distance !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-green-700 dark:text-green-300">Distance to Assignment:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-900 dark:text-green-100">
                            {assignedLocationInfo.distance}m
                          </span>
                          {assignedLocationInfo.isAtAssignedLocation ? (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200"
                            >
                              At Assigned Location
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200"
                            >
                              Remote Location
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : userProfile.assigned_location_id ? (
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">Assigned Location:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">Loading...</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">Assigned Location:</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">Not assigned</span>
                  </div>
                )}
                <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-xs">
                  <span className="text-green-800 dark:text-green-200">
                    ✓ You can check in at any QCC location within 50 meters of your current position
                  </span>
                </div>
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
                      {locationValidation.canCheckOut ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            Check-out available within {proximitySettings.checkInProximityRange}m range
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-orange-600">
                            Check-out requires being within {proximitySettings.checkInProximityRange}m of any QCC
                            location
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-4">
        {error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          {canCheckIn && (
            <Button onClick={handleCheckIn} disabled={isLoading || !locationValidation?.canCheckIn} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check In
                </>
              )}
            </Button>
          )}

          {canCheckOut && (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading || !locationValidation?.canCheckOut}
              variant="outline"
              className="flex-1 bg-transparent"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Out...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Check Out
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
