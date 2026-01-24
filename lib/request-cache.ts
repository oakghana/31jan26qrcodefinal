// Request deduplication cache for Supabase queries
// Prevents duplicate concurrent requests to the same endpoint
// Cache expires after 5 seconds to keep data fresh

type CacheEntry = {
  promise: Promise<any>
  timestamp: number
  ttl: number
}

const requestCache = new Map<string, CacheEntry>()

/**
 * Creates a cache key from request parameters
 * Used to deduplicate concurrent requests
 */
function getCacheKey(table: string, filters: Record<string, any>): string {
  return `${table}:${JSON.stringify(filters)}`
}

/**
 * Clears expired cache entries
 * Called periodically to prevent memory leaks
 */
function cleanupCache() {
  const now = Date.now()
  for (const [key, entry] of requestCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      requestCache.delete(key)
    }
  }
}

/**
 * Gets or creates a deduped request promise
 * If a similar request is already in flight, returns that promise instead
 * Reduces database load when multiple components fetch the same data
 */
export function getDedupedRequest<T>(
  table: string,
  filters: Record<string, any>,
  requestFn: () => Promise<T>,
  ttl = 5000 // 5 second cache by default
): Promise<T> {
  const key = getCacheKey(table, filters)
  const now = Date.now()

  // Check if we have a valid cached promise
  const cached = requestCache.get(key)
  if (cached && now - cached.timestamp < cached.ttl) {
    console.log(`[v0] Cache hit for ${key}`)
    return cached.promise
  }

  // Create new request and cache it
  const promise = requestFn().finally(() => {
    // Remove from cache after TTL expires
    setTimeout(() => requestCache.delete(key), ttl)
  })

  requestCache.set(key, {
    promise,
    timestamp: now,
    ttl,
  })

  // Cleanup old entries every minute
  if (requestCache.size % 10 === 0) {
    cleanupCache()
  }

  return promise
}

/**
 * Clears all cached requests
 * Use when user logs out or data needs to be refreshed
 */
export function clearRequestCache() {
  requestCache.clear()
  console.log("[v0] Request cache cleared")
}

/**
 * Gets current cache size for monitoring
 */
export function getCacheSize(): number {
  return requestCache.size
}
