export interface DeviceInfo {
  device_id: string
  device_name: string
  device_type: string
  browser_info: string
  ip_address?: string
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function generateDeviceId(): string {
  if (typeof document === "undefined") {
    throw new Error("generateDeviceId must be called on the client side.");
  }

  // Create a comprehensive device fingerprint that mimics MAC address uniqueness
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.textBaseline = "top"
    ctx.font = "14px Arial"
    ctx.fillText("Device fingerprint", 2, 2)
  }

  // Collect comprehensive device characteristics
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(",") || "",
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 0, // CPU cores
    navigator.deviceMemory || 0, // RAM in GB (if available)
    navigator.maxTouchPoints || 0, // Touch support
    (navigator as any).connection?.effectiveType || "", // Network type
    navigator.platform,
    navigator.vendor || "",
  ].join("|")

  // Create a robust hash
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Generate MAC-like format for better identification (e.g., MAC:AB:CD:EF:12)
  const hashStr = Math.abs(hash).toString(16).padStart(12, '0')
  const macLike = hashStr.match(/.{1,2}/g)?.slice(0, 6).join(':').toUpperCase() || hashStr
  
  return `MAC:${macLike}`
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    throw new Error("getDeviceInfo must be called on the client side.");
  }

  const deviceId = generateDeviceId()
  const deviceName = navigator.userAgent
  const isMobile = /Mobi|Android/i.test(navigator.userAgent)
  const isTablet = /Tablet|iPad/i.test(navigator.userAgent)
  const isDesktop = !isMobile && !isTablet

  return {
    device_id: deviceId,
    device_name: deviceName,
    device_type: isMobile ? "Mobile" : isTablet ? "Tablet" : "Desktop",
    browser_info: navigator.userAgent,
    isMobile,
    isTablet,
    isDesktop,
  }
}
