import type { HttpFetchOptions } from "./http.js";
import { fetch as httpFetch } from "./http.js";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const env = typeof process !== "undefined" ? process.env : {};
  const clientId = env.REDDIT_CLIENT_ID;
  const clientSecret = env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  try {
    const response = await globalThis.fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "User-Agent": "keytrace-runner/1.0 (identity verification bot)",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      console.warn(`[reddit-fetcher] OAuth token request failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000, // Refresh 1 min early
    };

    return cachedToken.token;
  } catch (err) {
    console.warn(`[reddit-fetcher] OAuth token fetch error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/**
 * Reddit-aware fetcher that uses OAuth when credentials are available.
 * Falls back to the public JSON API if REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET are not set.
 */
export async function fetch(url: string, options: HttpFetchOptions): Promise<unknown> {
  const token = await getAccessToken();

  if (token) {
    // Rewrite www/old.reddit.com → oauth.reddit.com and strip trailing .json
    const oauthUrl = url
      .replace(/^https:\/\/(www\.|old\.)?reddit\.com/, "https://oauth.reddit.com")
      .replace(/\.json(\/)?$/, "$1")
      .replace(/\/$/, "");

    console.log(`[reddit-fetcher] Using OAuth API: ${oauthUrl}`);
    return httpFetch(oauthUrl, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  console.log(`[reddit-fetcher] No OAuth credentials, using public API`);
  return httpFetch(url, options);
}
