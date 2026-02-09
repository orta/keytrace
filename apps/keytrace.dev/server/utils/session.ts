import type { H3Event } from "h3";
import { Agent } from "@atproto/api";
import { verifySignedDid, getOAuthClient } from "./oauth";

/**
 * Read the authenticated DID from the signed session cookie.
 * Returns the DID string or null if not authenticated / signature invalid.
 */
export function getAuthenticatedDid(event: H3Event): string | null {
  const raw = getCookie(event, "did");
  if (!raw) return null;
  return verifySignedDid(raw);
}

/**
 * Require authentication. Throws a 401 error if the user is not authenticated.
 * Returns the verified DID.
 */
export function requireAuth(event: H3Event): string {
  const did = getAuthenticatedDid(event);
  if (!did) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }
  return did;
}

/**
 * Restore the ATProto OAuth session agent for an authenticated user.
 * Throws 401 if not authenticated, 500 if session cannot be restored.
 */
export async function getSessionAgent(event: H3Event) {
  const did = requireAuth(event);
  const client = getOAuthClient();
  try {
    console.log(`[session] Restoring OAuth session for ${did}`);
    const oauthSession = await client.restore(did);
    const agent = new Agent(oauthSession);
    console.log(`[session] Session restored successfully`);
    return { did, agent };
  } catch (err) {
    console.error(`[session] Failed to restore OAuth session:`, err);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to restore OAuth session",
    });
  }
}
