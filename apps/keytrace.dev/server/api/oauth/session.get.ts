import { getOAuthClient, verifySignedDid } from "~/server/utils/oauth";

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
  try {
    const client = getOAuthClient();
    await client.restore(did);
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
    };
  } catch {
    return {
      authenticated: true,
      did,
    };
  }
});
