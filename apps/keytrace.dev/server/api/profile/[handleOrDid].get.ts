/**
 * GET /api/profile/:handleOrDid
 *
 * Fetch a user's profile and identity claims from ATProto.
 * Resolves handles to DIDs, fetches Bluesky profile info, and lists claims.
 */

import { fetchProfile, verifyAllClaims, getProfileSummary } from "@keytrace/runner";

export default defineEventHandler(async (event) => {
  const handleOrDid = getRouterParam(event, "handleOrDid");

  if (!handleOrDid) {
    throw createError({ statusCode: 400, statusMessage: "Missing handleOrDid parameter" });
  }

  const query = getQuery(event);
  const shouldVerify = query.verify === "true";

  try {
    const profile = await fetchProfile(handleOrDid);

    // Only verify claims when explicitly requested (prevents DoS via expensive verification)
    if (shouldVerify) {
      await verifyAllClaims(profile, { timeout: 10_000 });
    }

    return {
      did: profile.did,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
      claims: profile.claimInstances.map((claim) => {
        // Find corresponding claim data for additional fields
        const claimData = profile.claims.find((c) => c.uri === claim.uri);
        return {
          uri: claim.uri,
          did: claim.did,
          status: claim.status,
          type: claimData?.type,
          rkey: claimData?.rkey,
          comment: claimData?.comment,
          createdAt: claimData?.createdAt,
          identity: claimData?.identity,
          matches: claim.matches.map((m) => ({
            provider: m.provider.id,
            providerName: m.provider.name,
            isAmbiguous: m.isAmbiguous,
          })),
          errors: claim.errors,
        };
      }),
      summary: getProfileSummary(profile),
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("resolve")) {
      throw createError({
        statusCode: 404,
        statusMessage: "Profile not found",
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch profile",
    });
  }
});
