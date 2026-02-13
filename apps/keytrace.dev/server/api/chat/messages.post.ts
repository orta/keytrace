/**
 * POST /api/chat/messages
 *
 * Receives ALL messages from the Matterbridge ingester.
 * Broadcasts every message to connected SSE clients on /chat.
 * If a message contains a DID, also saves it to the relay store.
 *
 * Body: { text: string, username: string, account: string, gateway?: string }
 */
import { extractDid, extractPlatform } from "@keytrace/relay";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Same bearer token auth as relay/ingest
  const token = config.relayIngestToken;
  if (token) {
    const auth = getHeader(event, "authorization");
    if (auth !== `Bearer ${token}`) {
      throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }
  }

  const body = await readBody(event);
  const { text, username, account, gateway } = body ?? {};

  if (!text || typeof text !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing text" });
  }
  if (!username || typeof username !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing username" });
  }
  if (!account || typeof account !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing account" });
  }

  const platform = extractPlatform(account);
  const did = extractDid(text);

  let saved = false;
  if (did) {
    const store = getRelayStore();
    const result = await store.put(platform, username, did);
    saved = !!result;
    console.log(`[chat] DID saved: ${platform}/${username} → ${did}`);
  }

  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    text,
    username,
    platform,
    gateway,
    timestamp: Date.now(),
    did,
    saved,
  };

  broadcastMessage(msg);

  return { ok: true, id: msg.id, saved };
});
