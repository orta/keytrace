/**
 * GET /api/claims
 *
 * List the authenticated user's own identity claims.
 * Requires authentication (signed DID cookie).
 */

import { fetchProfile } from "@keytrace/runner";
import { requireAuth } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const did = requireAuth(event);

  try {
    const profile = await fetchProfile(did);

    return {
      did: profile.did,
      handle: profile.handle,
      claims: profile.claims,
    };
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch claims",
    });
  }
});
