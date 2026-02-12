"use client"

import type React from "react"
import { Sidebar } from "./sidebar"
import { OfflineIndicator } from "@/components/ui/offline-indicator"
import { PWAUpdateNotification } from "@/components/ui/pwa-update-notification"
import { FloatingHomeButton } from "./floating-home-button"
import { MobileBottomNav } from "./mobile-bottom-nav"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/98 to-muted/10">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="p-3 pb-20 lg:p-6 lg:pb-8 max-w-full">
          <div className="relative">
            {children}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none -z-10 rounded-3xl" />
          </div>
        </main>
      </div>      
      {/* Floating Home Button for quick navigation */}
      <FloatingHomeButton />
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      <PWAUpdateNotification />
      <OfflineIndicator />
    </div>
  )
}

export default DashboardLayout
