"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FlashMessageProps {
  message: string
  type?: "success" | "error" | "info"
  duration?: number // Duration in milliseconds
  onClose?: () => void
}

export function FlashMessage({ message, type = "info", duration = 50000, onClose }: FlashMessageProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    // Update progress bar every 100ms
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const decrement = (100 / duration) * 100
        return Math.max(0, prev - decrement)
      })
    }, 100)

    // Auto-close after duration
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => {
      clearInterval(progressInterval)
      clearTimeout(timer)
    }
  }, [duration, onClose])

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  }

  const colors = {
    success: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
    error: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
  }

  const progressColors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-right-5 duration-300">
      <Card className={`border-2 ${colors[type]} shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {icons[type]}
              <div className="flex-1">
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColors[type]} transition-all duration-100 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
