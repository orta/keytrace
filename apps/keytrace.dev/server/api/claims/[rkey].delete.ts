/**
 * DELETE /api/claims/:rkey
 *
 * Delete an identity claim record from the authenticated user's ATProto repo.
 * Requires authentication.
 */

import { COLLECTION_NSID } from "@keytrace/runner";
import { getSessionAgent } from "~/server/utils/session";

export default defineEventHandler(async (event) => {
  const { did, agent } = await getSessionAgent(event);

  const rkey = getRouterParam(event, "rkey");
  if (!rkey) {
    throw createError({ statusCode: 400, statusMessage: "Missing rkey parameter" });
  }

  // Validate rkey format (ATProto record keys are TIDs or other safe strings)
  if (!/^[a-zA-Z0-9._~-]+$/.test(rkey)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid rkey format" });
  }

  try {
    await agent.com.atproto.repo.deleteRecord({
      repo: did,
      collection: COLLECTION_NSID,
      rkey,
    });

    return { success: true };
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to delete claim record",
    });
  }
});
