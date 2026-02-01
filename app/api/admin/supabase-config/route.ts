import { NextResponse } from "next/server"

export async function GET() {
  try {
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL
    const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !!process.env.SUPABASE_ANON_KEY
    const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY

    return NextResponse.json({
      ok: true,
      hasSupabaseUrl: hasUrl,
      hasAnonKey: hasAnon,
      hasServiceKey: hasService,
    })
  } catch (error) {
    console.error("[v0] supabase-config check error:", error)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}
