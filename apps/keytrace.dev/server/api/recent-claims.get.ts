import { getRecentClaims } from "../utils/recent-claims"

/**
 * GET /api/recent-claims
 *
 * Public endpoint that returns the recent claims feed.
 * Cached for 60 seconds to reduce storage reads.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "public, max-age=60")

  const claims = await getRecentClaims()
  return claims
})
