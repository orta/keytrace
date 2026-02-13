/**
 * Standalone ingester that connects to the Matterbridge SSE stream
 * and forwards ALL messages to the keytrace.dev chat endpoint.
 * Messages containing a DID are also saved for identity verification.
 *
 * This is the ONLY process that talks to Matterbridge.
 * Run it as a sidecar alongside Matterbridge in production.
 *
 * Environment variables:
 *   MATTERBRIDGE_URL      - Matterbridge API base URL (default: http://localhost:4242)
 *   MATTERBRIDGE_TOKEN    - Bearer token for Matterbridge API (optional)
 *   KEYTRACE_CHAT_URL     - URL to POST all messages to (default: https://keytrace.dev/api/chat/messages)
 *   KEYTRACE_INGEST_TOKEN - Bearer token for the keytrace.dev endpoints
 */

import { extractDid, extractPlatform } from "./store.js";

interface IngesterConfig {
  matterbridgeUrl: string;
  matterbridgeToken: string;
  chatUrl: string;
  ingestToken: string;
}

function getConfig(): IngesterConfig {
  return {
    matterbridgeUrl: process.env.MATTERBRIDGE_URL ?? "http://localhost:4242",
    matterbridgeToken: process.env.MATTERBRIDGE_TOKEN ?? "",
    chatUrl: process.env.KEYTRACE_CHAT_URL ?? "https://keytrace.dev/api/chat/messages",
    ingestToken: process.env.KEYTRACE_INGEST_TOKEN ?? "",
  };
}

/** Forward a message to the keytrace.dev chat endpoint (broadcasts to SSE + saves DIDs) */
async function postToChat(
  config: IngesterConfig,
  msg: { text: string; username: string; userid?: string; account: string; gateway?: string },
): Promise<{ ok: boolean; saved?: boolean }> {
  try {
    const res = await fetch(config.chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.ingestToken ? { Authorization: `Bearer ${config.ingestToken}` } : {}),
      },
      body: JSON.stringify(msg),
    });

    if (!res.ok) {
      console.error(`[ingester] POST to ${config.chatUrl} failed: ${res.status} ${await res.text()}`);
      return { ok: false };
    }
    const body = await res.json();
    return { ok: true, saved: body.saved };
  } catch (err) {
    console.error(`[ingester] POST to ${config.chatUrl} error:`, err);
    return { ok: false };
  }
}

/** Send a reply back through Matterbridge to the user's platform */
async function sendReply(config: IngesterConfig, gateway: string, text: string): Promise<void> {
  try {
    await fetch(`${config.matterbridgeUrl}/api/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.matterbridgeToken ? { Authorization: `Bearer ${config.matterbridgeToken}` } : {}),
      },
      body: JSON.stringify({
        text,
        username: "keytrace",
        gateway,
      }),
    });
  } catch (err) {
    console.error("[ingester] Failed to send reply:", err);
  }
}

async function connectStream(config: IngesterConfig): Promise<void> {
  const streamUrl = `${config.matterbridgeUrl}/api/stream`;
  const headers: Record<string, string> = {};
  if (config.matterbridgeToken) {
    headers["Authorization"] = `Bearer ${config.matterbridgeToken}`;
  }

  console.log(`[ingester] Connecting to ${streamUrl}`);

  const res = await fetch(streamUrl, { headers });
  if (!res.ok) {
    throw new Error(`Stream connection failed: ${res.status}`);
  }
  if (!res.body) {
    throw new Error("Stream response has no body");
  }

  console.log("[ingester] Connected to Matterbridge stream");

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });

    // SSE messages are separated by newlines — process complete lines
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed);

        // Skip system events (like api_connected)
        if (msg.event) continue;

        const { text, username, userid, account, gateway } = msg;
        if (!text || !username || !account) continue;

        // Forward ALL messages to the chat endpoint (broadcasts to SSE clients + saves DIDs)
        const result = await postToChat(config, { text, username, userid, account, gateway });

        // If a DID was saved, send a confirmation reply back through the chat platform
        if (result.saved && gateway) {
          const did = extractDid(text);
          const platform = extractPlatform(account);
          console.log(`[ingester] DID saved: ${platform}/${username} → ${did}`);
          await sendReply(
            config,
            gateway,
            `Saved! ${did} is now linked to your ${platform} account "${username}". Verify at keytrace.dev/add`,
          );
        }
      } catch {
        // Not valid JSON or parse error — skip
      }
    }
  }
}

async function run(): Promise<void> {
  const config = getConfig();
  console.log(`[ingester] Matterbridge: ${config.matterbridgeUrl}`);
  console.log(`[ingester] Chat URL: ${config.chatUrl}`);

  while (true) {
    try {
      await connectStream(config);
      console.log("[ingester] Stream ended, reconnecting in 5s...");
    } catch (err) {
      console.error("[ingester] Stream error:", err);
      console.log("[ingester] Reconnecting in 5s...");
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

run();
