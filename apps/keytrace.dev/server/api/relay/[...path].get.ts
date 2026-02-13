/**
 * GET /api/relay/:platform/:identifier
 *
 * Public endpoint for the runner to fetch verified DID messages from the relay store.
 * The identifier can be a username or a platform-native userid (Signal UUID, etc.).
 * Both work because the store writes under both keys.
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

  const [platform, identifier] = parts;

  if (!platform || !identifier) {
    throw createError({ statusCode: 400, statusMessage: "Missing platform or identifier" });
  }

  const store = getRelayStore();
  const msg = await store.get(platform, decodeURIComponent(identifier));

  if (!msg) {
    throw createError({ statusCode: 404, statusMessage: "No verification found" });
  }

  return {
    did: msg.did,
    username: msg.username,
    userid: msg.userid,
    platform: msg.platform,
    timestamp: msg.timestamp,
  };
});
