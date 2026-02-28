/**
 * POST /api/proxy/http
 *
 * SSRF-safe HTTP proxy for browser-based claim verification.
 * Only allows requests to an explicit domain allowlist and blocks private IPs.
 */

const ALLOWED_DOMAINS = new Set([
  "github.com",
  "gist.github.com",
  "api.github.com",
  "gist.githubusercontent.com",
  "public.api.bsky.app",
  "plc.directory",
  "mastodon.social",
  "mastodon.online",
  "mstdn.social",
  "hachyderm.io",
  "infosec.exchange",
  "fosstodon.org",
  "techhub.social",
  "api.fxtwitter.com",
]);

const PRIVATE_IP_RANGES = [/^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^169\.254\./, /^0\./, /^::1$/, /^fc00:/, /^fe80:/, /^fd/];

function isPrivateIp(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some((re) => re.test(hostname));
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  }>(event);

  if (!body?.url || typeof body.url !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing url in request body" });
  }

  let parsed: URL;
  try {
    parsed = new URL(body.url);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "Invalid URL" });
  }

  // Only allow https
  if (parsed.protocol !== "https:") {
    throw createError({ statusCode: 400, statusMessage: "Only HTTPS URLs are allowed" });
  }

  // Domain allowlist check
  if (!ALLOWED_DOMAINS.has(parsed.hostname)) {
    throw createError({
      statusCode: 403,
      statusMessage: `Domain not allowed: ${parsed.hostname}`,
    });
  }

  // Block private IPs
  if (isPrivateIp(parsed.hostname)) {
    throw createError({ statusCode: 403, statusMessage: "Private IP addresses are not allowed" });
  }

  const method = (body.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method)) {
    throw createError({ statusCode: 400, statusMessage: "Only GET and HEAD methods are allowed" });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const response = await globalThis.fetch(parsed.toString(), {
      method,
      headers: {
        "User-Agent": "keytrace-proxy/1.0",
        ...(body.headers ?? {}),
      },
      signal: controller.signal,
      redirect: "manual",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `Upstream returned ${response.status}`,
      });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();

    // Return as JSON if the upstream content is JSON
    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        // Fall through to text return
      }
    }

    return { body: text, contentType };
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err) throw err;
    throw createError({
      statusCode: 502,
      statusMessage: "Proxy fetch failed",
    });
  }
});
