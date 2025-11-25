"use client"

import { useState, useEffect } from "react"
import {
  getCurrentLocation,
  getAveragedLocation,
  validateAttendanceLocation,
  validateCheckoutLocation,
  calculateDistance,
  detectWindowsLocationCapabilities,
  isWithinBrowserProximity,
  detectBrowser,
  type LocationData,
  type ProximitySettings,
  type GeoSettings,
} from "@/lib/geolocation"
import { getDeviceInfo } from "@/lib/device-info"
import type { QRCodeData } from "@/lib/qr-code"
import { useRealTimeLocations } from "@/hooks/use-real-time-locations"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast" // Imported toast
import { findNearestLocation } from "@/lib/geolocation" // Declared findNearestLocation
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, LogIn, LogOut, QrCode, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { LocationCodeDialog } from "@/components/dialogs/location-code-dialog"
import { QRScannerDialog } from "@/components/dialogs/qr-scanner-dialog"

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
  name: string // Added for convenience
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
  geoSettings?: GeoSettings
  locations: GeofenceLocation[]
  canCheckIn?: boolean
  canCheckOut?: boolean
}

// Placeholder for WindowsCapabilities, assuming it's defined elsewhere or inferred
type WindowsCapabilities = ReturnType<typeof detectWindowsLocationCapabilities>

export function AttendanceRecorder({
  todayAttendance: initialTodayAttendance,
  geoSettings,
  locations,
  canCheckIn: initialCanCheckIn,
  canCheckOut: initialCanCheckOut,
}: AttendanceRecorderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [userLocation, setUserLocation] = useState<LocationData | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [assignedLocationInfo, setAssignedLocationInfo] = useState<AssignedLocationInfo | null>(null)
  const {
    locations: realTimeLocations,
    loading: locationsLoading,
    error: locationsError,
    isConnected,
  } = useRealTimeLocations() // Renamed locations to avoid conflict
  const [proximitySettings, setProximitySettings] = useState<ProximitySettings>({
    checkInProximityRange: 50,
    defaultRadius: 20,
    requireHighAccuracy: true,
    allowManualOverride: false,
  })
  // const [geoSettings, setGeoSettings] = useState<GeoSettings | null>(null) // This is now a prop
  const [locationValidation, setLocationValidation] = useState<{
    canCheckIn: boolean
    canCheckOut?: boolean
    nearestLocation?: GeofenceLocation
    distance?: number
    message: string
    accuracyWarning?: string
    criticalAccuracyIssue?: boolean
    allLocations?: { location: GeofenceLocation; distance: number }[]
    availableLocations?: { location: GeofenceLocation; distance: number }[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successDialogMessage, setSuccessDialogMessage] = useState("")
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrScanMode, setQrScanMode] = useState<"checkin" | "checkout">("checkin")
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<{
    granted: boolean | null
    message: string
  }>({ granted: null, message: "" })
  const [showLocationHelp, setShowLocationHelp] = useState(false)
  const [windowsCapabilities, setWindowsCapabilities] = useState<ReturnType<
    typeof detectWindowsLocationCapabilities
  > | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split("T")[0])
  const [showEarlyCheckoutDialog, setShowEarlyCheckoutDialog] = useState(false)
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState("")
  const [pendingCheckoutData, setPendingCheckoutData] = useState<{
    location: LocationData | null
    nearestLocation: any
  } | null>(null)
  const [showCodeEntry, setShowCodeEntry] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showLocationCodeDialog, setShowLocationCodeDialog] = useState(false) // Added

  // Redundant state, managed by `todayAttendance` prop.
  // const [canCheckIn, setCanCheckIn] = useState(false)
  // const [canCheckOut, setCanCheckOut] = useState(false)
  // const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null)

  // Renamed for clarity and to avoid conflict with dialog state.
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Simplified locationPermissionStatus state
  const [locationPermissionStatusSimplified, setLocationPermissionStatusSimplified] = useState<{
    granted: boolean
    message: string
  }>({
    granted: false,
    message: "Click 'Get Current Location' to enable GPS-based attendance",
  })

  const [recentCheckIn, setRecentCheckIn] = useState(false)
  const [recentCheckOut, setRecentCheckOut] = useState(false)
  const [localTodayAttendance, setLocalTodayAttendance] = useState(initialTodayAttendance)

  const canCheckIn = initialCanCheckIn && !recentCheckIn && !localTodayAttendance?.check_in_time
  const canCheckOut =
    initialCanCheckOut &&
    !recentCheckOut &&
    localTodayAttendance?.check_in_time &&
    !localTodayAttendance?.check_out_time

  const handleQRScanSuccess = async (qrData: QRCodeData) => {
    console.log("[v0] QR scan successful, mode:", qrScanMode)
    setShowQRScanner(false)

    if (qrScanMode === "checkin") {
      await handleQRCheckIn(qrData)
    } else {
      await handleQRCheckOut(qrData)
    }
  }

  const handleQRCheckIn = async (qrData: QRCodeData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("[v0] Processing QR check-in with data:", qrData)

      const response = await fetch("/api/attendance/qr-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: qrData.locationId,
          qr_timestamp: qrData.timestamp,
          userLatitude: qrData.userLatitude,
          userLongitude: qrData.userLongitude,
          device_info: getDeviceInfo(),
        }),
      })

      const result = await response.json()
      console.log("[v0] QR check-in API response:", result)

      if (!response.ok) {
        const errorMsg = result.message || result.error || "Failed to check in with QR code"
        throw new Error(errorMsg)
      }

      setSuccess("✓ Checked in successfully with QR code!")
      console.log("[v0] QR check-in successful")

      // mutate() // Assuming mutate is a function from SWR or similar, not defined here, so commented out.

      // Show success popup
      setTimeout(() => {
        setSuccess(null)
      }, 5000)
    } catch (error: any) {
      console.error("[v0] QR check-in error:", error)
      setError(error.message || "Failed to check in with QR code")

      toast({
        title: "Check-in Failed",
        description: error.message || "Failed to check in with QR code",
        variant: "destructive",
        duration: 8000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQRCheckOut = async (qrData: QRCodeData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("[v0] Processing QR check-out with data:", qrData)

      const response = await fetch("/api/attendance/qr-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: qrData.locationId,
          qr_timestamp: qrData.timestamp,
          userLatitude: qrData.userLatitude,
          userLongitude: qrData.userLongitude,
          device_info: getDeviceInfo(),
        }),
      })

      const result = await response.json()
      console.log("[v0] QR check-out API response:", result)

      if (!response.ok) {
        const errorMsg = result.message || result.error || "Failed to check out with QR code"
        throw new Error(errorMsg)
      }

      setSuccess("✓ Checked out successfully with QR code!")
      console.log("[v0] QR check-out successful")

      // mutate() // Assuming mutate is a function from SWR or similar, not defined here, so commented out.

      // Show success popup
      setTimeout(() => {
        setSuccess(null)
      }, 5000)
    } catch (error: any) {
      console.error("[v0] QR check-out error:", error)
      setError(error.message || "Failed to check out with QR code")

      toast({
        title: "Check-out Failed",
        description: error.message || "Failed to check out with QR code",
        variant: "destructive",
        duration: 8000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUseQRCode = (mode: "checkin" | "checkout") => {
    // Redirect to QR Events page with mode parameter
    window.location.href = `/dashboard/qr-events?mode=${mode}`
  }

  useEffect(() => {
    fetchUserProfile()
    loadProximitySettings()
    // loadGeoSettings() // This is now a prop, no need to load it
    const capabilities = detectWindowsLocationCapabilities()
    setWindowsCapabilities(capabilities)
    console.log("[v0] Windows location capabilities detected:", capabilities)

    const autoLoadLocation = async () => {
      try {
        console.log("[v0] Auto-loading location on page load...")
        const location = await getCurrentLocation()
        setUserLocation(location)
        setLocationPermissionStatus({ granted: true, message: "Location access granted" })
        console.log("[v0] Location auto-loaded successfully:", location)

        const capabilities = detectWindowsLocationCapabilities()
        if (capabilities.isWindows && location.accuracy > 200) {
          setError(
            `GPS accuracy is ${Math.round(location.accuracy)}m. Click the refresh button to update your location for better accuracy.`,
          )
        }
      } catch (error) {
        console.log("[v0] Auto-load location failed, user can try manual check-in or QR code:", error)
        // Don't show error - user can still use check-in button or QR code
      }
    }

    autoLoadLocation()
  }, [])

  useEffect(() => {
    loadProximitySettings()
  }, [])

  // const loadGeoSettings = async () => { // This is now a prop
  //   try {
  //     const response = await fetch("/api/settings")
  //     if (response.ok) {
  //       const data = await response.json()
  //       if (data.systemSettings?.geo_settings) {
  //         setGeoSettings(data.systemSettings.geo_settings)
  //         console.log("[v0] Loaded geo settings with browser tolerances:", data.systemSettings.geo_settings)
  //       }
  //     }
  //   } catch (error) {
  //     console.error("[v0] Failed to load geo settings:", error)
  //   }
  // }

  useEffect(() => {
    const checkDateChange = () => {
      const newDate = new Date().toISOString().split("T")[0]
      if (newDate !== currentDate) {
        console.log("[v0] Date changed from", currentDate, "to", newDate)
        setCurrentDate(newDate)
        // Force re-render to update button state
        window.location.reload()
      }
    }

    // Check every minute for date changes
    const interval = setInterval(checkDateChange, 60000)

    return () => clearInterval(interval)
  }, [currentDate])

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

  // Update assigned location info when user location or realTimeLocations changes
  useEffect(() => {
    if (userLocation && realTimeLocations && realTimeLocations.length > 0 && userProfile?.assigned_location_id) {
      // Use realTimeLocations here
      const assignedLocation = realTimeLocations.find((loc) => loc.id === userProfile.assigned_location_id) // Use realTimeLocations here
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
          name: assignedLocation.name, // Assign name here
        })

        console.log("[v0] Assigned location info:", {
          name: assignedLocation.name,
          distance: Math.round(distance),
          isAtAssignedLocation,
          radius: assignedLocation.radius_meters,
        })
      }
    }
  }, [userLocation, realTimeLocations, userProfile]) // Use realTimeLocations here

  // Simplified location validation logic as per new update.
  // This effect is now primarily for logging and potentially updating `locationValidation` based on fetched `userLocation`.
  useEffect(() => {
    if (userLocation && realTimeLocations && realTimeLocations.length > 0) {
      // Use realTimeLocations here
      console.log(
        "[v0] All available locations:",
        realTimeLocations.map((l) => ({
          // Use realTimeLocations here
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

      const locationDistances = realTimeLocations // Use realTimeLocations here
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

      const validation = validateAttendanceLocation(userLocation, realTimeLocations, proximitySettings) // Use realTimeLocations here
      const checkoutValidation = validateCheckoutLocation(userLocation, realTimeLocations, proximitySettings) // Use realTimeLocations here

      console.log("[v0] Location validation result:", validation)
      console.log("[v0] Check-out validation result:", checkoutValidation)
      console.log(
        "[v0] Locations data:",
        realTimeLocations.map((l) => ({ name: l.name, radius: l.radius_meters })), // Use realTimeLocations here
      )
      console.log("[v0] Validation message:", validation.message)
      console.log("[v0] Can check in:", validation.canCheckIn)
      console.log("[v0] Can check out:", checkoutValidation.canCheckOut)
      console.log("[v0] Distance:", validation.distance)
      console.log("[v0] Nearest location being checked:", validation.nearestLocation?.name)
      console.log("[v0] Using proximity range:", proximitySettings.checkInProximityRange)

      // Check for critical accuracy issues
      const criticalAccuracyIssue =
        userLocation.accuracy > 1000 || (windowsCapabilities?.isWindows && userLocation.accuracy > 100)
      let accuracyWarning = ""
      if (criticalAccuracyIssue) {
        accuracyWarning = `Your current GPS accuracy (${userLocation.accuracy.toFixed(0)}m) is critically low. For accurate attendance, please use the QR code option or ensure you are in an open area with clear sky view.`
      } else if (userLocation.accuracy > 100) {
        accuracyWarning = `Your current GPS accuracy (${userLocation.accuracy.toFixed(0)}m) is moderate. For best results, ensure you have a clear view of the sky or move closer to your assigned location.`
      }

      setLocationValidation({
        ...validation,
        canCheckOut: checkoutValidation.canCheckOut,
        allLocations: locationDistances,
        criticalAccuracyIssue,
        accuracyWarning,
      })
    }
  }, [userLocation, realTimeLocations, proximitySettings, windowsCapabilities]) // Use realTimeLocations here

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
      const capabilities = detectWindowsLocationCapabilities()
      console.log("[v0] Browser:", capabilities.browserName)

      // For Opera and poor GPS browsers, use averaged readings
      const useSampling = capabilities.browserName === "Opera" || capabilities.hasKnownIssues

      console.log(`[v0] Using ${useSampling ? "multi-sample" : "single"} GPS reading...`)
      const location = useSampling ? await getAveragedLocation(3) : await getCurrentLocation()

      setUserLocation(location)

      // The IP validation was causing fetch errors and is not essential for functionality

      setLocationPermissionStatus({ granted: true, message: "Location access granted" })
      return location
    } catch (error) {
      console.error("[v0] Failed to get location:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Unable to access location. Please enable GPS or use QR code option."
      setError(errorMessage)
      setLocationPermissionStatus({
        granted: false,
        message: errorMessage,
      })
      setShowLocationHelp(true)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Cleaned up unused useEffect for location watch.
  // useEffect(() => {
  //   return () => {
  //     if (locationWatchId && navigator.geolocation) {
  //       navigator.geolocation.clearWatch(locationWatchId)
  //     }
  //   }
  // }, [locationWatchId])

  const handleCheckIn = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("[v0] Getting optimized location for check-in...")

      // Use browser-optimized location fetching
      const location = await getCurrentLocationData()
      if (!location) {
        setIsLoading(false)
        return
      }

      const browserInfo = detectBrowser()
      console.log("[v0] Browser detected:", browserInfo.name)

      if (!locations || locations.length === 0) {
        setError("No QCC locations found")
        setIsLoading(false)
        return
      }

      // Find nearest location
      const nearest = locations.reduce(
        (closest, loc) => {
          const dist = calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude)
          if (!closest || dist < closest.distance) {
            return { location: loc, distance: dist }
          }
          return closest
        },
        null as { location: GeofenceLocation; distance: number } | null,
      )

      if (!nearest) {
        setError("No QCC locations found")
        setIsLoading(false)
        return
      }

      const proximityCheck = await isWithinBrowserProximity(
        location,
        nearest.location.latitude,
        nearest.location.longitude,
        geoSettings || undefined,
      )

      console.log("[v0] Proximity check:", {
        distance: proximityCheck.distance,
        isWithin: proximityCheck.isWithin,
      })

      if (!proximityCheck.isWithin) {
        setError(
          `You must be within 100 meters of your assigned location to check in. You are currently ${Math.round(proximityCheck.distance)}m away. Please use manual location code entry or move closer.`,
        )
        setIsLoading(false)
        return
      }

      const deviceInfo = getDeviceInfo()

      console.log("[v0] Performing automatic check-in at:", nearest.location.name)

      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          location_id: nearest.location.id,
          location_name: nearest.location.name,
          device_info: navigator.userAgent,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to check in")
      }

      const result = await response.json()

      setLocalTodayAttendance({
        ...result.attendance,
        check_in_time: new Date().toISOString(),
        check_in_location_name: nearest.location.name,
      })
      setRecentCheckIn(true)

      const message = nearest.location.name
        ? `Checked in successfully at ${nearest.location.name}!`
        : "Checked in successfully!"
      setSuccessDialogMessage(message)
      setShowSuccessDialog(true)

      toast({
        title: "Check-in successful!",
        description: message,
      })

      setTimeout(() => {
        setRecentCheckIn(false)
      }, 120000)

      setTimeout(() => {
        window.location.reload()
      }, 3000)

      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Check-in error:", error)

      if (error instanceof Error && error.message.includes("timeout")) {
        setError(
          "Location request timed out. For instant check-in, use the manual location code entry option or ensure your device location services are enabled.",
        )
        setShowLocationHelp(true)
      } else {
        setError(error instanceof Error ? error.message : "An error occurred during check-in")
      }

      toast({
        title: "Check-in Failed",
        description: error instanceof Error ? error.message : "An error occurred during check-in",
        variant: "destructive",
        duration: 8000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("[v0] Getting location for check-out...")
      const location = await getCurrentLocation()
      setUserLocation(location)

      if (!locations || locations.length === 0) {
        setError("No QCC locations found")
        setIsLoading(false)
        return
      }

      const checkoutValidation = validateCheckoutLocation(location, locations, proximitySettings)

      if (!checkoutValidation.canCheckOut) {
        setError(checkoutValidation.message)
        setIsLoading(false)

        toast({
          title: "Check-out Failed",
          description: checkoutValidation.message,
          variant: "destructive",
          duration: 8000,
        })
        return
      }

      let nearestLocation = null

      if (locations.length > 1) {
        const locationDistances = locations
          .map((loc) => {
            const distance = calculateDistance(location.latitude, location.longitude, loc.latitude, loc.longitude)
            return { location: loc, distance: Math.round(distance) }
          })
          .sort((a, b) => a.distance - b.distance)
          .filter(({ distance }) => distance <= proximitySettings.checkInProximityRange)

        if (locationDistances.length === 0) {
          setError(`You must be within 100 meters of a QCC location to check out`)
          setIsLoading(false)

          toast({
            title: "Check-out Failed",
            description: `You must be within 100 meters of a QCC location to check out`,
            variant: "destructive",
            duration: 8000,
          })
          return
        }

        // Automatically select the best location for check-out
        if (userProfile?.assigned_location_id && assignedLocationInfo?.isAtAssignedLocation) {
          nearestLocation = locations.find((loc) => loc.id === userProfile.assigned_location_id)
          console.log("[v0] Automatically using assigned location for check-out:", nearestLocation?.name)
        } else {
          nearestLocation = locationDistances[0]?.location
          console.log("[v0] Automatically using nearest location for check-out:", nearestLocation?.name)
        }
      } else {
        const nearest = findNearestLocation(location, locations)
        nearestLocation = nearest?.location || locations[0]
      }

      const deviceInfo = getDeviceInfo()
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // Check for early checkout only if it's before 5 PM
      if (currentHour < 17 || (currentHour === 17 && currentMinute < 0)) {
        setPendingCheckoutData({ location, nearestLocation })
        setShowEarlyCheckoutDialog(true)
        setIsLoading(false)
        return
      }

      console.log("[v0] Performing checkout at:", nearestLocation?.name)

      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          location_id: nearestLocation?.id,
          device_info: deviceInfo,
          early_checkout_reason: earlyCheckoutReason || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to check out")
      }

      const result = await response.json()

      setLocalTodayAttendance({
        ...localTodayAttendance!,
        check_out_time: new Date().toISOString(),
        check_out_location_name: nearestLocation?.name,
      })
      setRecentCheckOut(true)

      const message = `Checked out successfully${nearestLocation?.name ? ` at ${nearestLocation.name}` : ""}!`
      setSuccessDialogMessage(message)
      setShowSuccessDialog(true)

      toast({
        title: "Check-out successful!",
        description: message,
      })

      setTimeout(() => {
        setRecentCheckOut(false)
      }, 120000) // 2 minutes

      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error("[v0] Check-out error:", error)
      setError(error instanceof Error ? error.message : "An error occurred during check-out")

      toast({
        title: "Check-out Failed",
        description: error instanceof Error ? error.message : "An error occurred during check-out",
        variant: "destructive",
        duration: 8000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const performCheckout = async (location: LocationData | null, nearestLocation: any, reason: string | null) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log("[v0] Attempting automatic check-out with location:", nearestLocation?.name)

      const requestBody = {
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        location_id: nearestLocation?.id || null,
        early_checkout_reason: reason || null,
      }

      console.log("[v0] Check-out request body:", requestBody)

      const response = await fetch("/api/attendance/check-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      let result
      const responseText = await response.text()

      try {
        result = JSON.parse(responseText)
      } catch {
        // If not JSON, treat as error message
        result = { error: responseText || `Server error (${response.status})` }
      }

      if (!response.ok) {
        setError(result.error || result.message || "Failed to check out")
        setIsLoading(false)
        return
      }

      console.log("[v0] Check-out response:", result)

      if (result.success) {
        if (result.earlyCheckoutWarning) {
          setError(
            `⚠️ EARLY CHECKOUT WARNING: ${result.earlyCheckoutWarning.message}\n\nYou are checking out before the standard 5:00 PM end time. This will be recorded and visible to your department head.`,
          )
          setTimeout(() => {
            setError(null)
            setSuccessDialogMessage(result.message)
            setShowSuccessDialog(true)
            setTimeout(() => {
              window.location.reload()
            }, 70000)
          }, 70000)
          return
        }

        setSuccessDialogMessage(result.message)
        setShowSuccessDialog(true)
        setTimeout(() => {
          window.location.reload()
        }, 70000)
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

  const handleEarlyCheckoutConfirm = async () => {
    if (!earlyCheckoutReason.trim()) {
      setError("Please provide a reason for early checkout")
      return
    }

    setShowEarlyCheckoutDialog(false)

    if (pendingCheckoutData) {
      await performCheckout(
        pendingCheckoutData.location,
        pendingCheckoutData.nearestLocation,
        earlyCheckoutReason.trim(),
      )
    }

    // Reset state
    setEarlyCheckoutReason("")
    setPendingCheckoutData(null)
  }

  const handleEarlyCheckoutCancel = () => {
    setShowEarlyCheckoutDialog(false)
    setEarlyCheckoutReason("")
    setPendingCheckoutData(null)
    setIsLoading(false)
  }

  const handleRefreshLocations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      console.log("[v0] Manually refreshing location...")
      const location = await getCurrentLocation()
      setUserLocation(location)

      if (location.accuracy > 1000) {
        setError(
          `GPS accuracy is critically poor (${(location.accuracy / 1000).toFixed(1)}km) - Use QR code for reliable attendance.`,
        )
      } else if (location.accuracy > 500) {
        setError(`GPS accuracy is poor (${Math.round(location.accuracy)}m). Consider using QR code for best results.`)
      } else {
        setSuccess(`Location refreshed successfully. Accuracy: ${Math.round(location.accuracy)}m`)
        setTimeout(() => setSuccess(null), 3000)
      }

      setLocationPermissionStatus({ granted: true, message: "Location access granted" })
      console.log("[v0] Location refreshed successfully")
    } catch (error) {
      console.error("[v0] Failed to refresh location:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Unable to access location. Please enable GPS or use QR code option."
      setError(errorMessage)
      setLocationPermissionStatus({ granted: false, message: errorMessage })
      setShowLocationHelp(true)
    } finally {
      setIsLoading(false)
    }
  }

  const checkInDate = localTodayAttendance?.check_in_time // Use localTodayAttendance
    ? new Date(localTodayAttendance.check_in_time).toISOString().split("T")[0]
    : null

  // If check-in was from a previous day, treat as if no check-in exists (allow new check-in)
  const isFromPreviousDay = checkInDate && checkInDate !== currentDate

  const isCheckedIn = localTodayAttendance?.check_in_time && !localTodayAttendance?.check_out_time && !isFromPreviousDay
  const isCheckedOut = localTodayAttendance?.check_out_time

  const defaultMode = canCheckIn ? "checkin" : canCheckOut ? "checkout" : null

  const handleLocationSelect = (location: GeofenceLocation) => {
    console.log("Location selected:", location.name)
    // For now, just log it. Could potentially trigger a check-in/out flow or show details.
    // For the purpose of fixing the undeclared variable, this function is now defined.
  }

  // JSX return statement with UI for attendance recording
  return (
    <div className="space-y-6">
      {/* GPS Status Banner */}
      {userLocation && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">GPS Location Active</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Accuracy: {userLocation.accuracy?.toFixed(0)}m
                  </p>
                </div>
              </div>
              <Button onClick={getCurrentLocationData} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning Messages */}
      {error && (
        <Card className="bg-destructive/10 border-destructive/20 dark:bg-destructive/50 dark:border-destructive/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Messages */}
      {successMessage && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">Success</p>
                  <p className="text-xs text-green-800 dark:text-green-200">{successMessage}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <Clock className="h-5 w-5 md:h-6 md:w-6" />
            Actions
          </CardTitle>
          <CardDescription className="text-base md:text-lg">Check in or out of your work location</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ADDED: current GPS location display above check-in buttons */}
          {userLocation && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Your Current Location</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      GPS: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Accuracy: {userLocation.accuracy?.toFixed(0)}m
                    </p>
                  </div>

                  {/* Show nearest location */}
                  {(() => {
                    if (!realTimeLocations || realTimeLocations.length === 0) return null

                    const locationsWithDistance = realTimeLocations.map((loc) => ({
                      location: loc,
                      distance: calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        loc.latitude,
                        loc.longitude,
                      ),
                    }))

                    // Handle case where locationsWithDistance might be empty if realTimeLocations is empty
                    if (locationsWithDistance.length === 0) return null

                    const nearest = locationsWithDistance.reduce((min, curr) =>
                      curr.distance < min.distance ? curr : min,
                    )

                    const isNearby = nearest.distance <= 2000 // 2000m for PC browsers

                    return (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          {isNearby ? "✓ At Location" : "Nearest Location"}
                        </p>
                        <p className="text-base font-bold text-blue-700 dark:text-blue-200 mt-1">
                          {nearest.location.name}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          {nearest.distance < 1000
                            ? `${nearest.distance.toFixed(0)}m away`
                            : `${(nearest.distance / 1000).toFixed(2)}km away`}
                        </p>
                      </div>
                    )
                  })()}
                </div>
                <Button
                  onClick={getCurrentLocationData}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="flex-shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          )}

          {!isCheckedIn && (
            <Button
              onClick={handleCheckIn}
              disabled={isLoading || isProcessing}
              size="lg"
              className="w-full h-14 md:h-16 text-base md:text-lg font-semibold bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 md:h-6 md:w-6 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                  Check In Now
                </>
              )}
            </Button>
          )}

          {isCheckedIn && !isCheckedOut && (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading || isProcessing}
              size="lg"
              className="w-full h-14 md:h-16 text-base md:text-lg font-semibold bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 md:h-6 md:w-6 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                  Check Out Now
                </>
              )}
            </Button>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-3">Alternative Method</p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowLocationCodeDialog(true)}
              className="w-full h-12 md:h-14 text-sm md:text-base"
            >
              <MapPin className="mr-2 h-4 w-4 md:h-5 md:w-5" />
              Enter Location Code Manually
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Tap your location below for instant check-in - no camera needed!
            </p>
          </div>

          {/* QR Scanner Options */}
          <Button onClick={() => setShowScanner(true)} variant="outline" size="lg" className="w-full h-12 md:h-14">
            <QrCode className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Use QR Code Scanner
          </Button>

          {/* Refresh Status Button */}
          <Button
            onClick={handleRefreshLocations}
            variant="secondary"
            size="lg"
            className="w-full h-12 md:h-14"
            disabled={isLoading}
          >
            <RefreshCw className={`h-5 w-5 md:h-6 md:w-6 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Attendance Status
          </Button>
          <p className="text-xs md:text-sm text-muted-foreground text-center">
            Click to manually update your attendance status if the buttons don't change after check-in/check-out
          </p>
        </CardContent>
      </Card>

      {/* Location Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Location Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Your Assigned Location */}
          <div className="rounded-lg border p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Your Assigned Location</p>
                <p className="text-lg md:text-xl font-semibold">{assignedLocationInfo?.name || "Loading..."}</p>
                {assignedLocationInfo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Distance: {(assignedLocationInfo.distance / 1000).toFixed(2)}km away</span>
                  </div>
                )}
              </div>
              {assignedLocationInfo && (
                <Badge variant={assignedLocationInfo.isAtAssignedLocation ? "default" : "secondary"}>
                  {assignedLocationInfo.isAtAssignedLocation ? "At Location" : "Remote Location"}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Select Location */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Quick Select Location</p>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {realTimeLocations && realTimeLocations.length > 0 ? (
                realTimeLocations.map((location) => {
                  const distance = userLocation
                    ? calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        location.latitude,
                        location.longitude,
                      )
                    : null

                  return (
                    <Button
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      variant="outline"
                      className="h-auto p-4 justify-start text-left"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-base">{location.name}</p>
                        {distance !== null && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {distance < 1000 ? `${distance.toFixed(0)}m` : `${(distance / 1000).toFixed(2)}km`} away
                          </p>
                        )}
                      </div>
                    </Button>
                  )
                })
              ) : (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No locations available</p>
                </div>
              )}
            </div>
          </div>

          {/* All QCC Locations */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">All QCC Locations</p>
            <div className="space-y-2">
              {realTimeLocations && realTimeLocations.length > 0 ? (
                realTimeLocations.map((location) => {
                  const distance = userLocation
                    ? calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        location.latitude,
                        location.longitude,
                      )
                    : null

                  return (
                    <div
                      key={location.id}
                      className="flex items-center justify-between p-3 md:p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm md:text-base">{location.name}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{location.address}</p>
                      </div>
                      {distance !== null && (
                        <Badge variant="outline" className="ml-2">
                          {distance < 1000 ? `${distance.toFixed(0)}m` : `${(distance / 1000).toFixed(1)}km`}
                        </Badge>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Loading locations...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Code Entry Dialog */}
      {showCodeEntry && (
        <LocationCodeDialog
          open={showCodeEntry}
          onClose={() => setShowCodeEntry(false)}
          locations={realTimeLocations || []}
          userLocation={userLocation}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          canCheckIn={canCheckIn}
          canCheckOut={canCheckOut}
          isCheckedIn={isCheckedIn}
        />
      )}

      {/* Location Code Dialog for manual entry */}
      {showLocationCodeDialog && (
        <LocationCodeDialog
          open={showLocationCodeDialog}
          onClose={() => setShowLocationCodeDialog(false)}
          locations={realTimeLocations || []}
          userLocation={userLocation}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          canCheckIn={canCheckIn}
          canCheckOut={canCheckOut}
          isCheckedIn={isCheckedIn}
        />
      )}

      {/* QR Scanner Dialog */}
      {showScanner && (
        <QRScannerDialog
          open={showScanner}
          onClose={() => setShowScanner(false)}
          mode={defaultMode}
          userLocation={userLocation}
        />
      )}
    </div>
  )
}
