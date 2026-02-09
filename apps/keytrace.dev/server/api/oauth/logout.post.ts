import { getOAuthClient, verifySignedDid } from "~/server/utils/oauth";

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, "did");

  if (cookie) {
    const did = verifySignedDid(cookie);
    if (did) {
      try {
        const client = getOAuthClient();
        await client.revoke(did);
      } catch {
        // Ignore revocation errors
      }
    }
  }

  deleteCookie(event, "did", { path: "/" });
  return { success: true };
});
