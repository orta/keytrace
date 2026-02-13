/**
 * GET /api/relay/:platform/:username
 *
 * Public endpoint for the runner to fetch verified DID messages from the relay store.
 * Returns the latest DID verification for a given platform/username pair.
 */
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path");
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: "Missing path" });
  }

  const parts = path.split("/");
  if (parts.length !== 2) {
    throw createError({ statusCode: 400, statusMessage: "Expected /api/relay/:platform/:username" });
  }

  const [platform, username] = parts;

  if (!platform || !username) {
    throw createError({ statusCode: 400, statusMessage: "Missing platform or username" });
  }

  const store = getRelayStore();
  const msg = await store.get(platform, decodeURIComponent(username));

  if (!msg) {
    throw createError({ statusCode: 404, statusMessage: "No verification found" });
  }

  return {
    did: msg.did,
    username: msg.username,
    platform: msg.platform,
    timestamp: msg.timestamp,
  };
});
