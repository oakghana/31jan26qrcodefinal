import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "QR code check-out is disabled. Please use GPS-based check-out from the Attendance page." },
    { status: 403 }
  )
}
