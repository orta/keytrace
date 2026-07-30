import { getRecentClaims, type RecentClaim } from "../utils/recent-claims";

/**
 * GET /api/recent-claims
 *
 * Public endpoint that returns the recent claims feed.
 * Cached for 60 seconds to reduce storage reads.
 * Resolves DIDs to handles for better display.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "public, max-age=60");

  const claims = await getRecentClaims();

  // Find claims with DIDs as handles and resolve them
  const didsToResolve = claims.filter((c) => c.handle.startsWith("did:")).map((c) => c.did);

  if (didsToResolve.length > 0) {
    const resolved = await resolveProfiles(didsToResolve);
    return claims.map((claim) => {
      if (claim.handle.startsWith("did:") && resolved[claim.did]) {
        return {
          ...claim,
          handle: resolved[claim.did].handle,
          avatar: claim.avatar || resolved[claim.did].avatar,
        };
      }
      return claim;
    });
  }

  return claims;
});

/**
 * Batch resolve DIDs to profiles using public API.
 */
async function resolveProfiles(dids: string[]): Promise<Record<string, { handle: string; avatar?: string }>> {
  const results: Record<string, { handle: string; avatar?: string }> = {};
  const uniqueDids = [...new Set(dids)];

  await Promise.all(
    uniqueDids.map(async (did) => {
      try {
        const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`);
        if (response.ok) {
          const profile = await response.json();
          results[did] = {
            handle: profile.handle,
            avatar: profile.avatar,
          };
        }
      } catch {
        // Ignore resolution failures
      }
    }),
  );

  return results;
}
