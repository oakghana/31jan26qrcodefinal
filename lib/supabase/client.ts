import { createBrowserClient } from "@supabase/ssr"

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (clientInstance) {
    return clientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vgtajtqxgczhykxtdcdz.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndGFqdHF4Z2N6aHlreHRkY2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU0ODE3ODUsImV4cCI6MjA0MTA1Nzc4NX0.N_pqSB1rcr4SCXO-Ix9c-FwjvL4BZvO2TM7KjR9GGXA"

  console.log("[v0] Supabase client initialization:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "missing",
  })

  clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return clientInstance
}
