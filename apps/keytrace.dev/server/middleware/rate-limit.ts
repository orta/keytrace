/**
 * Simple in-memory rate limiter middleware (SEC-08).
 *
 * Limits requests per IP address using a sliding-window counter stored in a Map.
 * The Map is periodically pruned to prevent unbounded memory growth.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const WINDOW_MS = 60_000 // 1 minute window
const MAX_REQUESTS = 60 // requests per window per IP
const PRUNE_INTERVAL_MS = 5 * 60_000 // prune stale entries every 5 minutes

let lastPrune = Date.now()

function pruneStaleEntries(): void {
  const now = Date.now()
  if (now - lastPrune < PRUNE_INTERVAL_MS) return
  lastPrune = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}

function getClientIp(event: any): string {
  const forwarded = getHeader(event, "x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return getHeader(event, "x-real-ip") || "unknown"
}

export default defineEventHandler((event) => {
  pruneStaleEntries()

  const ip = getClientIp(event)
  const now = Date.now()

  let entry = store.get(ip)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS }
    store.set(ip, entry)
  }

  entry.count++

  if (entry.count > MAX_REQUESTS) {
    setResponseHeader(event, "Retry-After", Math.ceil((entry.resetAt - now) / 1000))
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
    })
  }
})
