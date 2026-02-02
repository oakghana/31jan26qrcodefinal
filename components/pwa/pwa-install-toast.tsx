"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X, Smartphone, Monitor, Tablet } from "lucide-react"
import { usePWA } from "@/hooks/use-pwa"

export function PWAInstallToast() {
  const [isVisible, setIsVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const { canInstall, isInstalled, installPrompt } = usePWA()

  useEffect(() => {
    // Check if user has already dismissed or installed
    const hasSeenToast = localStorage.getItem("pwa-toast-dismissed")
    
    if (hasSeenToast || isInstalled) {
      setDismissed(true)
      return
    }

    // Show toast after a brief delay for better UX
    const showTimer = setTimeout(() => {
      setIsVisible(true)
    }, 1000)

    // Auto-hide after 5 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false)
    }, 6000) // 1s delay + 5s visible = 6s total

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [isInstalled])

  const handleInstall = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === "accepted") {
          localStorage.setItem("pwa-toast-dismissed", "true")
          setIsVisible(false)
        }
      } catch (error) {
        console.error("Install error:", error)
      }
    } else {
      // Show manual install instructions for iOS/Safari
      alert(
        "To install this app:\n\n" +
        "📱 iPhone/iPad: Tap the Share button, then 'Add to Home Screen'\n\n" +
        "💻 Desktop Chrome: Click the install icon (⊕) in the address bar\n\n" +
        "🖥️ Desktop Edge: Click (...) menu → Apps → Install this site as an app"
      )
    }
  }

  const handleDismiss = () => {
    localStorage.setItem("pwa-toast-dismissed", "true")
    setIsVisible(false)
    setDismissed(true)
  }

  // Don't render if already dismissed or installed
  if (dismissed || isInstalled || !isVisible) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl shadow-2xl p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
            <Download className="h-6 w-6" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">
              Install QCC Attendance App
            </h3>
            <p className="text-sm text-primary-foreground/90 mb-3">
              Get quick access from your home screen. Works offline!
            </p>
            
            <div className="flex items-center gap-2 text-xs text-primary-foreground/80 mb-3">
              <Smartphone className="h-3.5 w-3.5" />
              <span>Mobile</span>
              <span className="text-primary-foreground/40">•</span>
              <Tablet className="h-3.5 w-3.5" />
              <span>Tablet</span>
              <span className="text-primary-foreground/40">•</span>
              <Monitor className="h-3.5 w-3.5" />
              <span>Desktop</span>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                className="bg-white text-primary hover:bg-white/90 font-semibold shadow-sm"
              >
                <Download className="h-4 w-4 mr-1.5" />
                Install Now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
              >
                Maybe Later
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar showing auto-dismiss countdown */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/60 rounded-full animate-[shrink_5s_linear_1s_forwards]"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  )
}
