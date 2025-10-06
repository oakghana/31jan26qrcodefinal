import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
  )
}

const isV0Preview = typeof window !== "undefined" && window.location.hostname.includes("vusercontent.net")

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: !isV0Preview,
      persistSession: !isV0Preview,
      detectSessionInUrl: false,
      onAuthStateChange: (event, session) => {
        if (event === "TOKEN_REFRESHED" && !session && !isV0Preview) {
          localStorage.removeItem("supabase.auth.token")
          if (!window.location.pathname.startsWith("/auth")) {
            window.location.href = "/auth/login"
          }
        }
      },
    },
    global: {
      fetch: (url, options = {}) => {
        const timeoutMs = isV0Preview ? 8000 : 10000

        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(timeoutMs),
        }).catch((error) => {
          if (process.env.NODE_ENV === "development") {
            console.error("[v0] Supabase client fetch error:", error)
          }

          if (isV0Preview && (error.name === "AbortError" || error.message?.includes("Failed to fetch"))) {
            return new Response(JSON.stringify({ error: "Network unavailable in preview" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            })
          }

          if (
            !isV0Preview &&
            (error.message?.includes("refresh_token_not_found") || error.message?.includes("Invalid Refresh Token"))
          ) {
            localStorage.removeItem("supabase.auth.token")
            if (!window.location.pathname.startsWith("/auth")) {
              window.location.href = "/auth/login"
            }
          }

          throw error
        })
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
      heartbeatIntervalMs: 30000,
      reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000),
      timeout: 15000,
      logger: (level, message, details) => {
        if (level === "error" && process.env.NODE_ENV === "development") {
          console.warn("[v0] Realtime connection issue:", message, details)
        }
      },
    },
  })
}
