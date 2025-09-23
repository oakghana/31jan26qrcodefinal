import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { rateLimit, getClientIdentifier, createSecurityHeaders } from "@/lib/security"
import { ValidationError } from "@/lib/validation"

export interface AuthenticatedRequest extends NextRequest {
  user?: any
  profile?: any
}

export interface ApiMiddlewareConfig {
  requireAuth?: boolean
  requireRole?: string[]
  rateLimit?: {
    windowMs: number
    maxRequests: number
  }
  validateInput?: boolean
}

export async function withApiMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  config: ApiMiddlewareConfig = {},
) {
  return async (request: NextRequest) => {
    const headers = createSecurityHeaders()

    try {
      // Apply rate limiting if configured
      if (config.rateLimit) {
        const clientId = getClientIdentifier(request)
        const isAllowed = rateLimit(clientId, config.rateLimit)

        if (!isAllowed) {
          return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429, headers })
        }
      }

      // Authentication check
      if (config.requireAuth !== false) {
        const supabase = await createClient()
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          return NextResponse.json({ error: "Authentication required" }, { status: 401, headers })
        }

        // Get user profile for role checking
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

        if (!profile || !profile.is_active) {
          return NextResponse.json({ error: "Account not active" }, { status: 403, headers })
        }

        // Role-based access control
        if (config.requireRole && !config.requireRole.includes(profile.role)) {
          return NextResponse.json({ error: "Insufficient permissions" }, { status: 403, headers })
        }

        // Attach user and profile to request
        const authenticatedRequest = request as AuthenticatedRequest
        authenticatedRequest.user = user
        authenticatedRequest.profile = profile

        return await handler(authenticatedRequest)
      }

      return await handler(request as AuthenticatedRequest)
    } catch (error) {
      console.error("API Middleware error:", error)

      if (error instanceof ValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            field: error.field,
            code: error.code,
          },
          { status: 400, headers },
        )
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500, headers })
    }
  }
}

export function createApiHandler(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  config: ApiMiddlewareConfig = {},
) {
  return withApiMiddleware(handler, config)
}
