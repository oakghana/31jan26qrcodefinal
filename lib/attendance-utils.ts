export type DeptInfo = { code?: string | null; name?: string | null } | undefined | null

export function isWeekend(date: Date = new Date()): boolean {
  const d = date.getDay()
  return d === 0 || d === 6
}

export function isSecurityDept(dept?: DeptInfo): boolean {
  if (!dept) return false
  const code = (dept.code || "").toString().toLowerCase()
  const name = (dept.name || "").toString().toLowerCase()
  return code === "security" || name.includes("security")
}

export function isResearchDept(dept?: DeptInfo): boolean {
  if (!dept) return false
  const code = (dept.code || "").toString().toLowerCase()
  const name = (dept.name || "").toString().toLowerCase()
  return code === "research" || name.includes("research")
}

export function isExemptFromAttendanceReasons(role?: string | null): boolean {
  if (!role) return false
  const lowerRole = role.toLowerCase()
  return lowerRole === "department_head" || lowerRole === "regional_manager"
}

/**
 * Returns true when a lateness reason SHOULD be required.
 * - Requires reason only on weekdays (Mon-Fri)
 * - Security and Research departments are exempt
 * - Department heads and regional managers are exempt
 */
export function requiresLatenessReason(date: Date = new Date(), dept?: DeptInfo, role?: string | null): boolean {
  if (isWeekend(date)) return false
  if (isSecurityDept(dept)) return false
  if (isResearchDept(dept)) return false
  if (isExemptFromAttendanceReasons(role)) return false
  return true
}

/**
 * Returns true when an early-checkout reason should be enforced.
 * - Enforced only when location-level flag is true and it's not a weekend
 * - Department heads and regional managers are exempt
 */
export function requiresEarlyCheckoutReason(date: Date = new Date(), locationRequires: boolean = true, role?: string | null): boolean {
  if (!locationRequires) return false
  if (isWeekend(date)) return false
  if (isExemptFromAttendanceReasons(role)) return false
  return true
}
