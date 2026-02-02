"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Download,
  Smartphone,
  Check,
  Share,
  Plus,
  MoreVertical,
  Monitor,
  Wifi,
  Bell,
  Zap,
  ChevronRight,
  Apple,
  Chrome,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PWAInstallCardProps {
  className?: string
  compact?: boolean
}

export function PWAInstallCard({ className, compact = false }: PWAInstallCardProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "desktop" | "unknown">("unknown")

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType("ios")
    } else if (/android/.test(userAgent)) {
      setDeviceType("android")
    } else if (/windows|macintosh|linux/.test(userAgent)) {
      setDeviceType("desktop")
    }

    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      setIsInstalled(isStandalone || isInWebAppiOS)
    }

    checkInstalled()

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      ;(window as any).deferredPrompt = e
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setIsInstalling(false)
    }

    // Listen for custom events from service worker
    const handleInstallAvailable = (event: CustomEvent) => {
      setDeferredPrompt(event.detail)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    window.addEventListener("pwa-install-available", handleInstallAvailable as EventListener)

    // Check if prompt is already available
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      window.removeEventListener("pwa-install-available", handleInstallAvailable as EventListener)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      setIsInstalling(true)
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === "accepted") {
          console.log("[PWA] User accepted install")
        }
        setDeferredPrompt(null)
        ;(window as any).deferredPrompt = null
      } catch (error) {
        console.error("[PWA] Install error:", error)
      } finally {
        setIsInstalling(false)
      }
    } else {
      setShowInstructions(true)
    }
  }

  if (isInstalled) {
    if (compact) return null
    return (
      <Card className={cn("border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900", className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">App Installed</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                You're using the installed version of QCC Attendance
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <Button
          onClick={handleInstall}
          variant="default"
          size="lg"
          className={cn(
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg",
            className
          )}
          disabled={isInstalling}
        >
          {isInstalling ? (
            <>
              <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Installing...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Install App
            </>
          )}
        </Button>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <InstallInstructions deviceType={deviceType} onClose={() => setShowInstructions(false)} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
      <Card className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-background", className)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Install QCC Attendance App</CardTitle>
                <CardDescription className="mt-1">
                  Get faster access and work offline
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
              Recommended
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Instant Launch</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Wifi className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Works Offline</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Bell className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Push Alerts</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Monitor className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Full Screen</span>
            </div>
          </div>

          {/* Install Button */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleInstall}
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-lg py-6 shadow-lg"
              disabled={isInstalling}
            >
              {isInstalling ? (
                <>
                  <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Installing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Install Now - It's Free!
                </>
              )}
            </Button>

            <DialogTrigger asChild>
              <Button variant="ghost" className="text-muted-foreground">
                Need help? View installation steps
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogTrigger>
          </div>
        </CardContent>
      </Card>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <InstallInstructions deviceType={deviceType} onClose={() => setShowInstructions(false)} />
      </DialogContent>
    </Dialog>
  )
}

interface InstallInstructionsProps {
  deviceType: "ios" | "android" | "desktop" | "unknown"
  onClose: () => void
}

function InstallInstructions({ deviceType, onClose }: InstallInstructionsProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          How to Install QCC Attendance
        </DialogTitle>
        <DialogDescription>
          Follow the steps below for your device
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* iOS Instructions */}
        <div className={cn(
          "space-y-4 p-4 rounded-lg border",
          deviceType === "ios" ? "border-primary bg-primary/5" : "border-muted"
        )}>
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5" />
            <h3 className="font-semibold">iPhone / iPad (Safari)</h3>
            {deviceType === "ios" && (
              <Badge className="bg-primary text-primary-foreground">Your Device</Badge>
            )}
          </div>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              <span>Open this page in <strong>Safari</strong> browser (not Chrome)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              <div className="flex items-center gap-2">
                <span>Tap the <strong>Share</strong> button</span>
                <Share className="h-4 w-4 text-muted-foreground" />
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
              <div className="flex items-center gap-2">
                <span>Tap <strong>"Add"</strong> in the top right</span>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            </li>
          </ol>
        </div>

        {/* Android Instructions */}
        <div className={cn(
          "space-y-4 p-4 rounded-lg border",
          deviceType === "android" ? "border-primary bg-primary/5" : "border-muted"
        )}>
          <div className="flex items-center gap-2">
            <Chrome className="h-5 w-5" />
            <h3 className="font-semibold">Android (Chrome)</h3>
            {deviceType === "android" && (
              <Badge className="bg-primary text-primary-foreground">Your Device</Badge>
            )}
          </div>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              <span>Open this page in <strong>Chrome</strong> browser</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              <div className="flex items-center gap-2">
                <span>Tap the <strong>Menu</strong> button (3 dots)</span>
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
              <span>Tap <strong>"Install"</strong> to confirm</span>
            </li>
          </ol>
        </div>

        {/* Desktop Instructions */}
        <div className={cn(
          "space-y-4 p-4 rounded-lg border",
          deviceType === "desktop" ? "border-primary bg-primary/5" : "border-muted"
        )}>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            <h3 className="font-semibold">Desktop (Chrome/Edge)</h3>
            {deviceType === "desktop" && (
              <Badge className="bg-primary text-primary-foreground">Your Device</Badge>
            )}
          </div>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              <span>Look for the <strong>Install</strong> icon in the address bar</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              <div className="flex items-center gap-2">
                <span>Or click <strong>Menu</strong> (3 dots)</span>
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              <span>Select <strong>"Install QCC Attendance..."</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
              <span>Click <strong>"Install"</strong> in the popup</span>
            </li>
          </ol>
        </div>

        {/* Help Alert */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>After installation:</strong> The app icon will appear on your home screen or app drawer. 
            Tap it to open QCC Attendance instantly!
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onClose}>Got it</Button>
      </div>
    </>
  )
}

// Floating Install Button for mobile
export function FloatingInstallButton() {
  const [show, setShow] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    const isInWebAppiOS = (window.navigator as any).standalone === true
    
    setIsInstalled(isStandalone || isInWebAppiOS)

    // Show button after delay if on mobile and not installed
    if (isMobile && !isStandalone && !isInWebAppiOS) {
      const timer = setTimeout(() => setShow(true), 2000)
      return () => clearTimeout(timer)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  }, [])

  if (isInstalled || !show) return null

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:hidden animate-in slide-in-from-right-5">
      <Button
        size="lg"
        className="rounded-full shadow-xl bg-primary hover:bg-primary/90 h-14 px-6"
        onClick={() => {
          if (deferredPrompt) {
            deferredPrompt.prompt()
          } else {
            // Show instructions dialog - trigger via custom event
            window.dispatchEvent(new CustomEvent("show-pwa-instructions"))
          }
        }}
      >
        <Download className="w-5 h-5 mr-2" />
        Install App
      </Button>
    </div>
  )
}
