import QRCode from "qrcode"

export interface QRCodeData {
  type: "attendance" | "location"
  locationId: string
  timestamp: number
  signature: string
}

export async function generateQRCode(data: QRCodeData): Promise<string> {
  const qrData = JSON.stringify(data)
  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#2D5016", // QCC primary green
        light: "#FFFFFF",
      },
      width: 256,
    })
    return qrCodeDataURL
  } catch (error) {
    throw new Error("Failed to generate QR code")
  }
}

export function parseQRCode(qrData: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(qrData)
    if (parsed.type && parsed.locationId && parsed.timestamp && parsed.signature) {
      return parsed as QRCodeData
    }
    return null
  } catch {
    return null
  }
}

export function generateSignature(locationId: string, timestamp: number): string {
  // Simple signature generation - in production, use proper cryptographic signing
  const data = `${locationId}-${timestamp}-QCC-ATTENDANCE`
  return btoa(data).slice(0, 16)
}

export function validateQRCode(qrData: QRCodeData): { isValid: boolean; reason?: string } {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutes

  // Check if QR code is not too old
  if (now - qrData.timestamp > maxAge) {
    return { isValid: false, reason: "QR code has expired" }
  }

  // Validate signature
  const expectedSignature = generateSignature(qrData.locationId, qrData.timestamp)
  if (qrData.signature !== expectedSignature) {
    return { isValid: false, reason: "Invalid QR code signature" }
  }

  return { isValid: true }
}
