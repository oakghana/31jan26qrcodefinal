"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, X, CheckCircle, KeyRound } from "lucide-react"
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
      console.log("[v0] Processing manual code:", qrDataString)

      const qrData = parseQRCode(qrDataString)
      if (qrData) {
        const validation = validateQRCode(qrData)
        if (validation.isValid) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000, // Increased timeout for mobile
                maximumAge: 0,
              })
            })

            const userLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }

            console.log("[v0] User GPS location obtained for QR check-in:", userLocation)
            console.log("[v0] Distance to location:", qrData.location_id)

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

            if (!response.ok) {
              let errorMsg = result.error || "Failed to process QR code check-in"

              if (response.status === 403 && result.distance) {
                errorMsg = `You are too far from ${result.locationName} (${result.distance}m away). You must be within 40 meters to check in.`
              }

              console.error("[v0] QR check-in failed:", errorMsg)
              setError(errorMsg)

              toast({
                title: "Check-In Failed",
                description: errorMsg,
                variant: "destructive",
                duration: 8000,
              })
              return
            }

            const successMsg = "QR code scanned successfully!"
            setSuccess(successMsg)

            toast({
              title: "Success",
              description: successMsg,
              duration: 3000,
            })

            console.log("[v0] Valid QR code with GPS validation, calling onScanSuccess")
            onScanSuccess(result.data || qrData)
          } catch (gpsError) {
            console.error("[v0] Failed to get GPS location:", gpsError)
            const errorMsg =
              "Location access required for QR code check-in. Please enable location services. You must be within 40 meters of the location to check in."
            setError(errorMsg)

            toast({
              title: "Location Required",
              description: errorMsg,
              variant: "destructive",
              duration: 8000,
            })
          }
        } else {
          const errorMsg = validation.reason || "Invalid QR code"
          setError(errorMsg)

          toast({
            title: "Invalid QR Code",
            description: errorMsg,
            variant: "destructive",
            duration: 5000,
          })
        }
      } else {
        const errorMsg = "Invalid QR code format"
        setError(errorMsg)

        toast({
          title: "Invalid QR Code",
          description: errorMsg,
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch (error) {
      console.error("[v0] QR processing error:", error)
      const errorMsg = "Failed to process QR code"
      setError(errorMsg)

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
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
            <div className="text-center space-y-4">
              {/* Native camera button for mobile */}
              <label htmlFor="qr-camera-input">
                <div className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-20 px-8 py-6 w-full cursor-pointer">
                  <Camera className="h-8 w-8" />
                  <span className="text-lg">Open Camera to Scan QR Code</span>
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

              <p className="text-sm text-muted-foreground">Tap above to open your camera and scan the QR code</p>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button variant="outline" onClick={() => setShowManualInput(!showManualInput)} className="w-full h-16">
                <KeyRound className="mr-2 h-4 w-4" />
                <span className="text-base">Enter Location Code Manually</span>
              </Button>
            </div>
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
