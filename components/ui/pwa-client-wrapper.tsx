"use client"

import dynamic from "next/dynamic"

const PWAServiceWorker = dynamic(
  () => import("@/components/ui/pwa-service-worker").then((mod) => ({ default: mod.PWAServiceWorker })),
  { ssr: false },
)
const PWAUpdateNotification = dynamic(
  () => import("@/components/ui/pwa-update-notification").then((mod) => ({ default: mod.PWAUpdateNotification })),
  { ssr: false },
)
const MobileInstallPrompt = dynamic(
  () => import("@/components/ui/install-app-button").then((mod) => ({ default: mod.MobileInstallPrompt })),
  { ssr: false },
)

export function PWAClientWrapper() {
  return (
    <>
      <PWAServiceWorker />
      <MobileInstallPrompt />
      <PWAUpdateNotification />
    </>
  )
}
