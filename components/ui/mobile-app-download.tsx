"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Smartphone, Download, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

interface MobileAppDownloadProps {
  className?: string
  variant?: "sidebar" | "dashboard"
}

export function MobileAppDownload({ className, variant = "sidebar" }: MobileAppDownloadProps) {
  const [isInstalling, setIsInstalling] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const checkInstalled = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
      setIsInstalled(standalone)
      return standalone
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      const installed = checkInstalled()

      if (!installed) {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
      }
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setIsInstalling(false)
    }

    checkInstalled()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkInstalled()
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const handlePWAInstall = async () => {
    setIsInstalling(true)

    try {
      if (deferredPrompt) {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === "dismissed") {
          setDeferredPrompt(null)
          setIsInstalling(false)
        }
      } else {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        const isAndroid = /Android/.test(navigator.userAgent)
        const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

        let instructions = "📱 Install QCC Attendance App:\n\n"

        if (isIOS && isSafari) {
          instructions += "1. Tap the Share button (⬆️) at the bottom\n"
          instructions += "2. Scroll down and tap 'Add to Home Screen'\n"
          instructions += "3. Tap 'Add' to install the app\n\n"
        } else if (isAndroid) {
          instructions += "1. Tap the menu (⋮) in your browser\n"
          instructions += "2. Select 'Add to Home screen' or 'Install app'\n"
          instructions += "3. Tap 'Add' or 'Install' to confirm\n\n"
        } else {
          instructions += "1. Look for an install icon (⬇️) in your browser's address bar\n"
          instructions += "2. Click it and select 'Install'\n"
          instructions += "3. Or use your browser's menu to 'Install app'\n\n"
        }

        instructions += "✅ App Features:\n"
        instructions += "• Real-time GPS location tracking\n"
        instructions += "• Offline attendance recording\n"
        instructions += "• Push notifications\n"
        instructions += "• Native mobile experience"

        alert(instructions)
        setIsInstalling(false)
      }
    } catch (error) {
      console.error("[PWA] Installation error:", error)
      setIsInstalling(false)
    }
  }

  const canInstall = deferredPrompt !== null && !isInstalled

  if (isInstalled) {
    return null
  }

  // Dashboard variant - floating badge with clear call-to-action
  return (
    <div className={cn("fixed bottom-6 right-6 z-40", className)}>
      <Button
        onClick={handlePWAInstall}
        disabled={isInstalling}
        size="lg"
        className="h-auto px-6 py-4 rounded-2xl shadow-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:shadow-3xl transition-all duration-300 hover:scale-105 touch-manipulation flex items-center gap-3"
      >
        <div className="relative">
          <Smartphone className="h-6 w-6" />
          {canInstall && (
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-3 w-3 text-yellow-300 animate-pulse" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start">
          <span className="font-semibold text-base">Install App</span>
          <span className="text-xs opacity-90">Download to your device</span>
        </div>
        {isInstalling ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download className="h-5 w-5" />
        )}
      </Button>
    </div>
  )
}
