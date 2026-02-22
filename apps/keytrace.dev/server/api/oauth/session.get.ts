import { getOAuthClient, verifySignedDid, OAUTH_SCOPE } from "~/server/utils/oauth";

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, "did");

  if (!cookie) {
    return { authenticated: false };
  }

  // Verify the cookie signature (SEC-03)
  const did = verifySignedDid(cookie);
  if (!did) {
    // Invalid signature -- clear the tampered cookie
    deleteCookie(event, "did", { path: "/" });
    return { authenticated: false };
  }

  // Validate that the OAuth session is still active (SEC-05)
  let needsReauth = false;
  try {
    const client = getOAuthClient();
    const session = await client.restore(did);

    // Check if the granted scopes cover all required scopes
    const tokenInfo = await session.getTokenInfo();
    const grantedScopes = new Set((tokenInfo.scope || "").split(" ").filter(Boolean));
    const requiredScopes = OAUTH_SCOPE.split(" ").filter(Boolean);
    needsReauth = requiredScopes.some((s) => !grantedScopes.has(s));
  } catch {
    // OAuth session expired or revoked -- clear cookie
    deleteCookie(event, "did", { path: "/" });
    return { authenticated: false };
  }

  try {
    const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`);
    const profile = await response.json();

    return {
      authenticated: true,
      did,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
      needsReauth,
    };
  } catch {
    return {
      authenticated: true,
      did,
      needsReauth,
    };
  }
});
