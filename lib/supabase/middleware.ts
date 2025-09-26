import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  console.log("[v0] Middleware env check:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    nextPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    regularUrl: !!process.env.SUPABASE_URL,
    nextPublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    regularKey: !!process.env.SUPABASE_ANON_KEY,
  })

  const fallbackUrl = "https://vgtajtqxgczhjboatvol.supabase.co"
  const fallbackKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aGpib2F0dm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzUyNDgsImV4cCI6MjA3MjU1MTI0OH0.EuuTCRC-rDoz_WHl4pwpV6_fEqrqcgGroa4nTjAEn1k"

  const finalUrl = supabaseUrl || fallbackUrl
  const finalKey = supabaseKey || fallbackKey

  if (!finalUrl || !finalKey) {
    console.log("[v0] Missing Supabase credentials in middleware, skipping auth check")
    return NextResponse.next({
      request,
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(finalUrl, finalKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    })

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Allow access to auth pages and static files
    if (
      request.nextUrl.pathname !== "/" &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/_next") &&
      !request.nextUrl.pathname.startsWith("/favicon")
    ) {
      // For v0 preview, be more permissive with auth
      const isV0Preview = request.nextUrl.hostname.includes("vusercontent.net")
      if (!isV0Preview && !user) {
        // Only redirect in production if user is not authenticated
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error("[v0] Middleware error:", error)
    return NextResponse.next({
      request,
    })
  }
}
