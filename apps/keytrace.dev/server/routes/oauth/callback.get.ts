import { getOAuthClient, getPublicUrl, signDid } from "~/server/utils/oauth";

export default defineEventHandler(async (event) => {
  try {
    const url = getRequestURL(event);
    const params = new URLSearchParams(url.search);
    const client = getOAuthClient();

    const { session } = await client.callback(params);
    const did = session.did;

    // Store signed DID in a cookie (SEC-03)
    setCookie(event, "did", signDid(did), {
      httpOnly: true,
      sameSite: "lax",
      secure: getPublicUrl().startsWith("https"),
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return sendRedirect(event, "/");
  } catch (error) {
    console.error("OAuth callback error:", error);
    return sendRedirect(event, "/?error=auth_failed");
  }
});
