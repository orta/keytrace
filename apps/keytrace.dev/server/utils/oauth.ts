import { createHmac } from "node:crypto";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { createSessionStore, createStateStore } from "./storage";

let _oauthClient: NodeOAuthClient | null = null;

// --- Session cookie signing (SEC-02, SEC-03) ---

function getSessionSecret(): string {
  return useRuntimeConfig().sessionSecret;
}

/** Produce an HMAC-SHA256 hex signature for a DID string. */
function hmacSign(did: string): string {
  return createHmac("sha256", getSessionSecret()).update(did).digest("hex");
}

/**
 * Create a signed cookie value: `{did}.{signature}`
 * The signature prevents clients from forging arbitrary DIDs.
 */
export function signDid(did: string): string {
  return `${did}.${hmacSign(did)}`;
}

/**
 * Verify a signed cookie value and return the DID, or `null` if invalid.
 */
export function verifySignedDid(cookie: string): string | null {
  const lastDot = cookie.lastIndexOf(".");
  if (lastDot === -1) return null;

  const did = cookie.substring(0, lastDot);
  const sig = cookie.substring(lastDot + 1);

  // Constant-time comparison to prevent timing attacks
  const expected = hmacSign(did);
  if (sig.length !== expected.length) return null;

  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0 ? did : null;
}

/**
 * Log a warning if the session secret is still the default value.
 * Called once when the OAuth client is first created (SEC-02).
 */
function checkSessionSecret(): void {
  if (getSessionSecret() === "dev-secret-change-in-production") {
    console.warn("[SECURITY] sessionSecret is set to the default value. " + "Set NUXT_SESSION_SECRET to a strong random string before deploying to production.");
  }
}

export const OAUTH_SCOPE =
  "atproto repo:dev.keytrace.claim?action=create repo:dev.keytrace.claim?action=update repo:dev.keytrace.claim?action=delete repo:dev.keytrace.profile?action=create repo:dev.keytrace.profile?action=update";

export function getPublicUrl(): string {
  const config = useRuntimeConfig();
  return (config.public.publicUrl || "http://127.0.0.1:3000").replace(/\/$/, "");
}

function isLoopback(url: string): boolean {
  return url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
}

const PRODUCTION_URL = "https://keytrace.dev";

export function getClientMetadata() {
  const publicUrl = getPublicUrl();
  const loopback = isLoopback(publicUrl);

  if (loopback) {
    // Dev mode: use production keytrace.dev as client_id so the PDS can fetch
    // valid metadata. The dev-callback route on production forwards to localhost.
    return {
      client_id: `${PRODUCTION_URL}/.well-known/oauth-client-metadata.json`,
      client_name: "keytrace.dev",
      client_uri: PRODUCTION_URL,
      redirect_uris: [`${PRODUCTION_URL}/oauth/dev-callback`] as [string],
      grant_types: ["authorization_code", "refresh_token"] as ["authorization_code", "refresh_token"],
      response_types: ["code"] as ["code"],
      scope: OAUTH_SCOPE,
      token_endpoint_auth_method: "none" as const,
      application_type: "web" as const,
      dpop_bound_access_tokens: true,
    };
  }

  // Production: include both the normal callback and dev-callback in redirect_uris
  // so the PDS accepts either when validating the client metadata
  return {
    client_id: `${publicUrl}/.well-known/oauth-client-metadata.json`,
    client_name: "keytrace.dev",
    client_uri: publicUrl,
    redirect_uris: [`${publicUrl}/oauth/callback`, `${publicUrl}/oauth/dev-callback`] as [string, string],
    grant_types: ["authorization_code", "refresh_token"] as ["authorization_code", "refresh_token"],
    response_types: ["code"] as ["code"],
    scope: OAUTH_SCOPE,
    token_endpoint_auth_method: "none" as const,
    application_type: "web" as const,
    dpop_bound_access_tokens: true,
  };
}

export function getOAuthClient(): NodeOAuthClient {
  if (!_oauthClient) {
    checkSessionSecret();
    _oauthClient = new NodeOAuthClient({
      clientMetadata: getClientMetadata(),
      stateStore: createStateStore(),
      sessionStore: createSessionStore(),
    });
  }
  return _oauthClient;
}
