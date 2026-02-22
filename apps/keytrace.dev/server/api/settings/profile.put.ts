/**
 * PUT /api/settings/profile
 *
 * Create or update the authenticated user's keytrace profile settings.
 * Writes a dev.keytrace.profile record with rkey "self".
 */

import { getSessionAgent } from "~/server/utils/session";

const PROFILE_NSID = "dev.keytrace.profile";

export default defineEventHandler(async (event) => {
  const { did, agent } = await getSessionAgent(event);

  const body = await readBody<{
    displayName?: string;
    bio?: string;
  }>(event);

  // Validate field lengths
  if (body.displayName && body.displayName.length > 128) {
    throw createError({ statusCode: 400, statusMessage: "Display name must be 128 characters or fewer" });
  }
  if (body.bio && body.bio.length > 1024) {
    throw createError({ statusCode: 400, statusMessage: "Bio must be 1024 characters or fewer" });
  }

  const record: Record<string, any> = {
    $type: PROFILE_NSID,
    createdAt: new Date().toISOString(),
  };

  // Only include non-empty fields
  if (body.displayName) record.displayName = body.displayName;
  if (body.bio) record.bio = body.bio;

  try {
    const res = await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: PROFILE_NSID,
      rkey: "self",
      record,
    });

    return {
      uri: res.data.uri,
      cid: res.data.cid,
      displayName: body.displayName ?? "",
      bio: body.bio ?? "",
    };
  } catch (err: unknown) {
    console.error(`[settings] Failed to save profile:`, err);

    const status = (err as any)?.status ?? (err as any)?.statusCode;
    if (status === 401 || status === 403) {
      throw createError({
        statusCode: 403,
        statusMessage: "App access has been revoked. Please re-authorize keytrace.",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to save profile settings",
    });
  }
});
