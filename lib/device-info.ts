export interface DeviceInfo {
  device_id: string
  device_name: string
  device_type: string
  browser_info: string
  ip_address?: string
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLaptop?: boolean
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
    (navigator as any).deviceMemory || 0, // RAM in GB (if available)
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
  function getFriendlyDeviceName(): string {
    try {
      // Prefer userAgentData when available (Chromium-based browsers)
      const uaData = (navigator as any).userAgentData
      if (uaData && uaData.platform) {
        const brand = Array.isArray(uaData.brands) && uaData.brands.length > 0 ? uaData.brands[0].brand : uaData.ua || 'Browser'
        const platform = uaData.platform || navigator.platform || 'Device'
        return `${brand} on ${platform}`
      }

      // Fallback: detect browser name + simplified platform
      const ua = navigator.userAgent || ''
      let browser = 'Browser'
      if (/firefox/i.test(ua)) browser = 'Firefox'
      else if (/edg\//i.test(ua)) browser = 'Edge'
      else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome'
      else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
      else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera'

      const platform = navigator.platform || (() => {
        const lower = ua.toLowerCase()
        if (lower.includes('windows')) return 'Windows'
        if (lower.includes('mac os') || lower.includes('macintosh')) return 'macOS'
        if (lower.includes('android')) return 'Android'
        if (lower.includes('iphone') || lower.includes('ipad')) return 'iOS'
        if (lower.includes('linux')) return 'Linux'
        return 'Device'
      })()

      // Keep result short — avoid exposing full UA string in UI
      return `${browser} on ${platform}`
    } catch (e) {
      return navigator.userAgent.slice(0, 80) + (navigator.userAgent.length > 80 ? '…' : '')
    }
  }

  const deviceName = getFriendlyDeviceName()
  const isMobile = /Mobi|Android/i.test(navigator.userAgent)
  const isTablet = /Tablet|iPad/i.test(navigator.userAgent)
  const isDesktop = !isMobile && !isTablet
  const isLaptop = isDesktop // Heuristic: treat desktops as laptops for broader compatibility

  return {
    device_id: deviceId,
    device_name: deviceName,
    device_type: isMobile ? "mobile" : isTablet ? "tablet" : isLaptop ? "laptop" : "desktop",
    browser_info: navigator.userAgent,
    isMobile,
    isTablet,
    isDesktop,
    isLaptop,
  }
}
