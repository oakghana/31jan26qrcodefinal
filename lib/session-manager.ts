import { createClient } from "@/lib/supabase/server"
import type { NextRequest } from "next/server"

interface SessionInfo {
  user_id: string
  session_id: string
  ip_address: string
  user_agent: string
  last_activity: Date
  device_fingerprint?: string
}

export class SessionManager {
  private static readonly MAX_CONCURRENT_SESSIONS = 3
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly ACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000 // 2 hours

  static async trackSession(request: NextRequest, userId: string): Promise<void> {
    const supabase = await createClient()
    const sessionId = this.generateSessionId()
    const ipAddress = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Clean up expired sessions
    await this.cleanupExpiredSessions(userId)

    // Check concurrent session limit
    const activeSessions = await this.getActiveSessions(userId)
    if (activeSessions.length >= this.MAX_CONCURRENT_SESSIONS) {
      // Remove oldest session
      await this.removeOldestSession(userId)
    }

    // Create new session record
    await supabase.from("user_sessions").insert({
      user_id: userId,
      session_id: sessionId,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      is_active: true,
    })
  }

  static async updateActivity(userId: string, sessionId: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from("user_sessions")
      .update({
        last_activity: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .eq("is_active", true)
  }

  static async invalidateSession(userId: string, sessionId?: string): Promise<void> {
    const supabase = await createClient()

    let query = supabase
      .from("user_sessions")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("user_id", userId)

    if (sessionId) {
      query = query.eq("session_id", sessionId)
    }

    await query
  }

  static async invalidateAllSessions(userId: string): Promise<void> {
    await this.invalidateSession(userId)
  }

  static async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    const supabase = await createClient()

    const { data } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("last_activity", { ascending: false })

    return data || []
  }

  static async detectSuspiciousActivity(userId: string, request: NextRequest): Promise<boolean> {
    const currentIp = request.ip || request.headers.get("x-forwarded-for")
    const currentUserAgent = request.headers.get("user-agent")

    const recentSessions = await this.getActiveSessions(userId)

    // Check for multiple IPs in short time
    const recentIps = recentSessions
      .filter((s) => new Date(s.last_activity).getTime() > Date.now() - 60 * 60 * 1000) // Last hour
      .map((s) => s.ip_address)
      .filter((ip, index, arr) => arr.indexOf(ip) === index)

    if (recentIps.length > 2 && currentIp && !recentIps.includes(currentIp)) {
      return true // Suspicious: too many different IPs
    }

    // Check for rapid session creation
    const recentSessionCount = recentSessions.filter(
      (s) => new Date(s.last_activity).getTime() > Date.now() - 15 * 60 * 1000, // Last 15 minutes
    ).length

    if (recentSessionCount > 5) {
      return true // Suspicious: too many sessions in short time
    }

    return false
  }

  private static async cleanupExpiredSessions(userId: string): Promise<void> {
    const supabase = await createClient()
    const cutoffTime = new Date(Date.now() - this.ACTIVITY_TIMEOUT).toISOString()

    await supabase
      .from("user_sessions")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("user_id", userId)
      .lt("last_activity", cutoffTime)
      .eq("is_active", true)
  }

  private static async removeOldestSession(userId: string): Promise<void> {
    const supabase = await createClient()

    const { data: oldestSession } = await supabase
      .from("user_sessions")
      .select("session_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("last_activity", { ascending: true })
      .limit(1)
      .single()

    if (oldestSession) {
      await this.invalidateSession(userId, oldestSession.session_id)
    }
  }

  private static generateSessionId(): string {
    return crypto.randomUUID()
  }
}
