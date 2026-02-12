"use client"

import type React from "react"
import { NotificationProvider } from "@/components/ui/notification-system"
import { TimeBasedThemeProvider } from "@/components/theme/time-based-theme-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { PWAComponents } from "./pwa-components"

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <TimeBasedThemeProvider>
        <NotificationProvider>{children}</NotificationProvider>
        <PWAComponents />
      </TimeBasedThemeProvider>
    </ErrorBoundary>
  )
}

