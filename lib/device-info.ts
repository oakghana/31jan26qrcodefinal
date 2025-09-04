export interface DeviceInfo {
  device_id: string
  device_name: string
  device_type: string
  browser_info: string
  ip_address?: string
}

export function generateDeviceId(): string {
  // Create a unique device ID based on browser fingerprint
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.textBaseline = "top"
    ctx.font = "14px Arial"
    ctx.fillText("Device fingerprint", 2, 2)
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|")

  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return `device_${Math.abs(hash).toString(36)}`
}

export function getDeviceInfo(): DeviceInfo {
  const deviceId = generateDeviceId()

  // Detect device type
  let deviceType = "desktop"
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    deviceType = "mobile"
  } else if (/iPad/i.test(navigator.userAgent)) {
    deviceType = "tablet"
  }

  // Get device name
  let deviceName = "Unknown Device"
  if (/iPhone/i.test(navigator.userAgent)) {
    deviceName = "iPhone"
  } else if (/iPad/i.test(navigator.userAgent)) {
    deviceName = "iPad"
  } else if (/Android/i.test(navigator.userAgent)) {
    deviceName = "Android Device"
  } else if (/Windows/i.test(navigator.userAgent)) {
    deviceName = "Windows PC"
  } else if (/Mac/i.test(navigator.userAgent)) {
    deviceName = "Mac"
  }

  return {
    device_id: deviceId,
    device_name: deviceName,
    device_type: deviceType,
    browser_info: navigator.userAgent,
  }
}
