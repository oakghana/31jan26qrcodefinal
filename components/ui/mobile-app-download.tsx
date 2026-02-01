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
  const [showModal, setShowModal] = useState(false)
  // Only show floating CTA on Mondays (1) and Fridays (5)
  const [showFloating, setShowFloating] = useState(false)

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

    // Auto-open the install modal (instructions) when not installed,
    // but only on Mondays and Fridays to avoid nuisance on other days.
    let autoTimer: ReturnType<typeof setTimeout> | null = null
    const day = new Date().getDay()
    const allowedDay = day === 1 || day === 5 // Monday=1, Friday=5

    if (!checkInstalled() && allowedDay) {
      // Only show once per session (e.g., once after login/tab open)
      try {
        const sessionKey = "pwaInstallShown"
        const alreadyShown = typeof window !== "undefined" && sessionStorage.getItem(sessionKey)

        if (!alreadyShown) {
          setShowModal(true)
          setShowFloating(true)
          // mark shown for this session so it won't reappear
          if (typeof window !== "undefined") sessionStorage.setItem(sessionKey, "1")

          // Auto-hide modal and floating CTA after 10s to avoid nuisance
          autoTimer = setTimeout(() => {
            setShowModal(false)
            setShowFloating(false)
          }, 10000)
        }
      } catch (e) {
        // if sessionStorage isn't available, fall back to showing once
        setShowModal(true)
        setShowFloating(true)
        autoTimer = setTimeout(() => {
          setShowModal(false)
          setShowFloating(false)
        }, 10000)
      }
    }

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
      if (autoTimer) clearTimeout(autoTimer)
    }
  }, [])

  // Ensure any time the modal is opened it auto-closes after 10s
  useEffect(() => {
    if (!showModal) return
    const t = setTimeout(() => setShowModal(false), 10000)
    return () => clearTimeout(t)
  }, [showModal])

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
        // Fallback: show a friendly modal/alert with instructions for iOS/Android and general browsers
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

        // show a modal/alert — prefer modal, but keep alert fallback
        if (typeof window !== 'undefined' && window?.document) {
          alert(instructions)
        }
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

  // Dashboard variant - floating badge with clear call-to-action + modal
  return (
    <>
      {showModal && !isInstalled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative max-w-lg w-full bg-white rounded-xl shadow-xl p-6 z-10">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <Smartphone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Install QCC Attendance</h3>
                <p className="text-sm text-muted-foreground mt-1">Follow the steps below to install the app on your device.</p>
                <div className="mt-4 text-sm space-y-2">
                  <p className="font-medium">iOS (Safari)</p>
                  <p>- Tap the Share button (⬆️) → Add to Home Screen → Add</p>
                  <p className="font-medium mt-2">Android</p>
                  <p>- Menu (⋮) → Add to Home screen / Install app → Confirm</p>
                  <p className="font-medium mt-2">Other browsers</p>
                  <p>- Look for an install icon in the address bar or use the browser menu → Install</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setShowModal(false)}>Close</Button>
              <Button onClick={() => { handlePWAInstall(); setShowModal(false); }} disabled={isInstalling}>
                {isInstalling ? 'Installing...' : 'Install'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <Button
          onClick={() => setShowModal(true)}
          disabled={isInstalling}
          size="lg"
          className="h-auto px-6 py-4 rounded-3xl shadow-2xl bg-green-500 hover:bg-green-600 text-white hover:shadow-3xl transition-all duration-300 hover:scale-105 touch-manipulation flex items-center gap-3"
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
            <span className="text-xs opacity-90">Download & install instantly</span>
          </div>
          {isInstalling ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
        </Button>
      </div>
    </>
  )
}
