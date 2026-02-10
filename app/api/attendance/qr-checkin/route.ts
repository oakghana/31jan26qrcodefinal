import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "QR code check-in is disabled. Please use GPS-based check-in from the Attendance page." },
    { status: 403 }
  )
}
