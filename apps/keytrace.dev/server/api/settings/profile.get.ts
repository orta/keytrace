/**
 * GET /api/settings/profile
 *
 * Fetch the authenticated user's keytrace profile settings.
 * Returns the dev.keytrace.profile record or defaults if none exists.
 */

import { getSessionAgent } from "~/server/utils/session";

const PROFILE_NSID = "dev.keytrace.profile";

export default defineEventHandler(async (event) => {
  const { did, agent } = await getSessionAgent(event);

  try {
    const res = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: PROFILE_NSID,
      rkey: "self",
    });

    const value = res.data.value as Record<string, any>;
    return {
      displayName: value.displayName ?? "",
      bio: value.bio ?? "",
    };
  } catch {
    // No profile record yet — return defaults
    return {
      displayName: "",
      bio: "",
    };
  }
});
