"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, X, CheckCircle, KeyRound, Upload } from "lucide-react"
import { parseQRCode, validateQRCode, type QRCodeData } from "@/lib/qr-code"
import { useToast } from "@/hooks/use-toast"

interface QRScannerProps {
  onScanSuccess: (data: QRCodeData) => void
  onClose: () => void
  autoStart?: boolean
}

export function QRScanner({ onScanSuccess, onClose, autoStart = false }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setIsMobile(checkMobile)
    console.log("[v0] Mobile device detected:", checkMobile)

    if (autoStart && !checkMobile) {
      startScanning()
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      setIsScanning(true)

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, max: 1920, min: 640 },
          height: { ideal: 1080, max: 1080, min: 480 },
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: false,
      }

      console.log("[v0] Requesting camera access for mobile device")
      console.log("[v0] Camera constraints:", constraints)

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported on this device")
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("[v0] Camera stream obtained successfully")

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream

        videoRef.current.setAttribute("playsinline", "true")
        videoRef.current.setAttribute("webkit-playsinline", "true")
        videoRef.current.setAttribute("muted", "true")
        videoRef.current.setAttribute("autoplay", "true")
        videoRef.current.muted = true

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000)

          videoRef.current!.onloadedmetadata = () => {
            clearTimeout(timeout)
            console.log("[v0] Video metadata loaded")
            resolve()
          }

          videoRef.current!.onerror = (e) => {
            clearTimeout(timeout)
            console.error("[v0] Video error:", e)
            reject(new Error("Video load error"))
          }
        })

        await videoRef.current.play()
        console.log("[v0] Camera stream started successfully, starting QR scan interval")

        setTimeout(() => {
          scanIntervalRef.current = setInterval(scanForQRCode, 300)
        }, 500)
      }
    } catch (err) {
      console.error("[v0] Camera access error:", err)

      let errorMessage = "Unable to access camera. "

      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage += "Please allow camera permissions in your browser settings and reload the page."
        } else if (err.name === "NotFoundError") {
          errorMessage += "No camera found on your device. Try using the 'Enter Location Code' option instead."
        } else if (err.name === "NotReadableError") {
          errorMessage += "Camera is already in use by another app. Please close other apps and try again."
        } else {
          errorMessage += err.message || "Please enable camera permissions and try again."
        }
      }

      setError(errorMessage)
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      })

      setIsScanning(false)
    }
  }

  const scanForQRCode = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      const jsQR = (await import("jsqr")).default
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      })

      if (code) {
        console.log("[v0] QR code detected:", code.data)
        await processQRCode(code.data)
      }
    } catch (error) {
      console.error("[v0] QR scanning error:", error)
    }
  }

  const processQRCode = async (qrDataString: string) => {
    try {
      stopScanning()
      console.log("[v0] Processing QR code:", qrDataString)

      const qrData = parseQRCode(qrDataString)
      if (!qrData) {
        const errorMsg = "Invalid QR code format. Please scan a valid location QR code."
        setError(errorMsg)
        toast({
          title: "Invalid QR Code",
          description: errorMsg,
          variant: "destructive",
          duration: 8000,
        })
        return
      }

      const validation = validateQRCode(qrData)
      if (!validation.isValid) {
        const errorMsg = validation.reason || "Invalid or expired QR code"
        setError(errorMsg)
        toast({
          title: "Invalid QR Code",
          description: errorMsg,
          variant: "destructive",
          duration: 8000,
        })
        return
      }

      console.log("[v0] Getting GPS location for QR code verification...")

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("GPS location timeout. Please ensure location services are enabled."))
          }, 15000)

          navigator.geolocation.getCurrentPosition(
            (pos) => {
              clearTimeout(timeout)
              resolve(pos)
            },
            (err) => {
              clearTimeout(timeout)
              let errorMessage = "Unable to get your location. "

              if (err.code === 1) {
                errorMessage += "Please enable location permissions in your browser/phone settings."
              } else if (err.code === 2) {
                errorMessage += "Location unavailable. Please check your GPS/WiFi settings."
              } else if (err.code === 3) {
                errorMessage += "Location request timed out. Please try again."
              } else {
                errorMessage += err.message || "Please enable location services."
              }

              reject(new Error(errorMessage))
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            },
          )
        })

        const userLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }

        console.log("[v0] GPS location obtained:", userLocation)

        const response = await fetch("/api/attendance/qr-checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location_id: qrData.location_id,
            qr_timestamp: new Date().toISOString(),
            userLatitude: userLocation.latitude,
            userLongitude: userLocation.longitude,
            device_info: {
              browser: navigator.userAgent,
              platform: navigator.platform,
            },
          }),
        })

        const result = await response.json()
        console.log("[v0] QR check-in API response:", result)

        if (!response.ok) {
          let errorMsg = "Failed to check in"

          if (response.status === 403) {
            // Distance error
            if (result.distance && result.locationName) {
              errorMsg = `You are ${result.distance}m away from ${result.locationName}. You must be within 40 meters to check in using QR code.`
            } else if (result.message) {
              errorMsg = result.message
            } else if (result.error) {
              errorMsg = result.error
            }
          } else if (response.status === 400) {
            errorMsg = result.error || result.message || "Invalid QR code or location"
          } else if (response.status === 401) {
            errorMsg = "You are not logged in. Please log in and try again."
          } else {
            errorMsg = result.error || result.message || "An error occurred during check-in"
          }

          console.error("[v0] QR check-in failed:", errorMsg)
          setError(errorMsg)

          toast({
            title: "Check-In Failed",
            description: errorMsg,
            variant: "destructive",
            duration: 10000,
          })
          return
        }

        const successMsg =
          result.message || `Successfully checked in at ${result.data?.location_tracking?.location_name || "location"}`
        setSuccess(successMsg)

        toast({
          title: "Check-In Successful",
          description: successMsg,
          variant: "default",
          duration: 5000,
        })

        console.log("[v0] QR check-in successful")
        onScanSuccess(qrData)
      } catch (gpsError) {
        console.error("[v0] GPS error:", gpsError)

        const errorMsg =
          gpsError instanceof Error
            ? gpsError.message
            : "Unable to get your location. Please enable location services and try again."

        setError(errorMsg)

        toast({
          title: "Location Required",
          description: errorMsg,
          variant: "destructive",
          duration: 10000,
        })
      }
    } catch (error) {
      console.error("[v0] QR processing error:", error)

      const errorMsg = error instanceof Error ? error.message : "Failed to process QR code. Please try again."

      setError(errorMsg)

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
        duration: 8000,
      })
    }
  }

  const stopScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log("[v0] Processing uploaded QR image:", file.name)
    setError(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result as string

      const img = new Image()
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext("2d")

          if (!ctx) {
            setError("Failed to process image")
            return
          }

          ctx.drawImage(img, 0, 0)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

          const jsQR = (await import("jsqr")).default
          const code = jsQR(imageData.data, imageData.width, imageData.height)

          if (code) {
            console.log("[v0] QR code found in uploaded image:", code.data)
            await processQRCode(code.data)
          } else {
            setError("No QR code found in image. Please try again with a clearer image.")
            toast({
              title: "No QR Code Found",
              description: "Please ensure the QR code is visible and try again.",
              variant: "destructive",
              duration: 5000,
            })
          }
        } catch (error) {
          console.error("[v0] Image processing error:", error)
          setError("Failed to process image")
        }
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  }

  const handleManualCodeSubmit = async () => {
    if (!manualCode.trim()) {
      setError("Please enter a location code")
      return
    }

    try {
      const qrData = parseQRCode(manualCode)
      if (qrData) {
        const validation = validateQRCode(qrData)
        if (validation.isValid) {
          setSuccess("Location code validated successfully!")
          console.log("[v0] Valid manual code, calling onScanSuccess")

          try {
            console.log("[v0] Attempting to get GPS for manual entry (optional, 3 second timeout)...")
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error("GPS timeout")), 3000) // Shorter timeout
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  clearTimeout(timeout)
                  resolve(pos)
                },
                (err) => {
                  clearTimeout(timeout)
                  reject(err)
                },
                { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }, // Less strict requirements
              )
            })

            // GPS available - add to QR data
            console.log("[v0] GPS location obtained for manual code entry, distance will be verified")
            toast({
              title: "GPS Obtained",
              description: "Your location will be verified (must be within 40m)",
              duration: 3000,
            })
            onScanSuccess({
              ...qrData,
              userLatitude: position.coords.latitude,
              userLongitude: position.coords.longitude,
            })
          } catch (gpsError) {
            console.log("[v0] GPS not available for manual code entry, proceeding WITHOUT GPS verification")
            toast({
              title: "GPS Unavailable",
              description: "Checking in without GPS verification. Location verified by code only.",
              duration: 4000,
            })
            // Proceed without GPS - no distance check will be performed
            onScanSuccess(qrData)
          }
        } else {
          setError(validation.reason || "Invalid location code")
        }
      } else {
        setError("Invalid location code format. Expected format: HO-SWZ-001")
      }
    } catch (error) {
      console.error("[v0] Manual code processing error:", error)
      setError("Failed to process location code")
    }
  }

  const startMobileCamera = async () => {
    try {
      setError(null)
      setIsScanning(true)

      console.log("[v0] Starting mobile camera for QR scanning")

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { exact: "environment" }, // Force back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log("[v0] Mobile camera stream obtained successfully")

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true")
        videoRef.current.setAttribute("webkit-playsinline", "true")
        videoRef.current.setAttribute("muted", "true")
        videoRef.current.setAttribute("autoplay", "true")
        videoRef.current.muted = true

        await videoRef.current.play()
        console.log("[v0] Mobile camera started, beginning QR scan")

        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(scanForQRCode, 500)

        toast({
          title: "Camera Active",
          description: "Point your camera at the QR code to scan",
          duration: 3000,
        })
      }
    } catch (error: any) {
      console.error("[v0] Mobile camera error:", error)
      let errorMessage = "Failed to access camera. "

      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        errorMessage += "Please allow camera access in your browser settings."
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera found on your device."
      } else if (error.name === "NotReadableError") {
        errorMessage += "Camera is being used by another app."
      } else {
        errorMessage += "Please try using manual code entry instead."
      }

      setError(errorMessage)
      setIsScanning(false)

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      })
    }
  }

  useEffect(() => {
    if (autoStart && !isScanning && !isMobile) {
      startScanning()
    }

    return () => {
      stopScanning()
    }
  }, [autoStart])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>QR Code Scanner</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Scan location QR code or enter code manually</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 text-green-900 border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {isMobile ? (
          <div className="space-y-4">
            {!isScanning ? (
              <div className="text-center space-y-4">
                <Button onClick={startMobileCamera} size="lg" className="w-full h-20 text-lg">
                  <Camera className="h-8 w-8 mr-3" />
                  Start Camera to Scan QR Code
                </Button>

                <p className="text-sm text-muted-foreground">
                  Tap above to activate your camera and scan the QR code in real-time
                </p>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or upload photo</span>
                  </div>
                </div>

                <label htmlFor="qr-camera-input">
                  <div className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-16 px-6 w-full cursor-pointer">
                    <Upload className="h-6 w-6" />
                    <span>Upload QR Code Photo</span>
                  </div>
                </label>
                <input
                  id="qr-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            ) : (
              <div className="relative">
                <video ref={videoRef} className="w-full rounded-lg" playsInline muted autoPlay />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-4 border-primary w-64 h-64 rounded-lg relative">
                    <div className="absolute w-full h-1 bg-primary/70 animate-scan" />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={stopScanning} variant="outline" className="flex-1 bg-transparent">
                    Stop Camera
                  </Button>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or enter code manually</span>
              </div>
            </div>

            <Button variant="outline" onClick={() => setShowManualInput(!showManualInput)} className="w-full">
              <KeyRound className="mr-2 h-4 w-4" />
              Enter Location Code Manually
            </Button>
          </div>
        ) : (
          // Desktop camera interface
          <div className="space-y-4">
            {!isScanning ? (
              <div className="space-y-4">
                <Button onClick={startScanning} className="w-full h-16" size="lg">
                  <Camera className="mr-2 h-6 w-6" />
                  <span className="text-lg">Start Camera Scanner</span>
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr-upload">Upload QR Code Image</Label>
                  <Input id="qr-upload" type="file" accept="image/*" onChange={handleFileUpload} />
                </div>

                <Button variant="outline" onClick={() => setShowManualInput(!showManualInput)} className="w-full">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Enter Location Code Manually
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                    style={{ transform: "scaleX(-1)" }}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanning animation overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border-4 border-white rounded-lg relative">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 animate-scan-line" />
                    </div>
                  </div>
                </div>

                <Button onClick={stopScanning} variant="destructive" className="w-full">
                  Stop Scanning
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Manual code input */}
        {showManualInput && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="manual-code">Location Code</Label>
              <Input
                id="manual-code"
                type="text"
                placeholder="Enter the location code from QR"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter the code shown below the QR code on the location sign
              </p>
            </div>
            <Button onClick={handleManualCodeSubmit} className="w-full" size="lg">
              Submit Location Code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
