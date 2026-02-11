import { getOAuthClient, getPublicUrl, signDid } from "~/server/utils/oauth";

function isDevTunnel(host: string): boolean {
  return !host.startsWith("localhost") && !host.startsWith("127.0.0.1") && !host.endsWith("keytrace.dev");
}

export default defineEventHandler(async (event) => {
  try {
    const url = getRequestURL(event);

    // When OAuth redirects back to a dev tunnel (e.g. loca.lt, ngrok),
    // forward the callback to localhost so the OAuth client can process it
    if (isDevTunnel(url.host)) {
      const localUrl = new URL(url.pathname + url.search, "http://localhost:3000");
      return sendRedirect(event, localUrl.toString());
    }

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
