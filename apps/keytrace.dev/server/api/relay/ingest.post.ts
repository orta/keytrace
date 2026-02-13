/**
 * POST /api/relay/ingest
 *
 * Receives DID verification messages from the Matterbridge ingester.
 * Protected by a bearer token (NUXT_RELAY_INGEST_TOKEN).
 *
 * Body: { platform: string, username: string, did: string }
 */

const DID_PATTERN = /^did:(plc|web):[a-zA-Z0-9._:%-]+$/;
const PLATFORM_PATTERN = /^[a-z]+$/;

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Token auth — required in production, optional in dev
  const token = config.relayIngestToken;
  if (token) {
    const auth = getHeader(event, "authorization");
    if (auth !== `Bearer ${token}`) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
  }

  const body = await readBody(event);
  const { platform, username, did } = body ?? {};

  if (!platform || typeof platform !== "string" || !PLATFORM_PATTERN.test(platform)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid platform" });
  }

  if (!username || typeof username !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Invalid username" });
  }

  if (!did || typeof did !== "string" || !DID_PATTERN.test(did)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid DID" });
  }

  const store = getRelayStore();
  await store.put(platform, username, did);

  console.log(`[relay] Ingested: ${platform}/${username} → ${did}`);

  return { ok: true, platform, username, did };
});
