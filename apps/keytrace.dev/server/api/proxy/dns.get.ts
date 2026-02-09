/**
 * GET /api/proxy/dns?domain=example.com
 *
 * DNS TXT record lookup proxy for browser-based claim verification.
 */

import dns from "node:dns";

const DOMAIN_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const domain = query.domain as string | undefined;

  if (!domain || typeof domain !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing domain query parameter" });
  }

  if (!DOMAIN_REGEX.test(domain)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid domain format" });
  }

  // Block lookups for private/internal domains
  const blockedSuffixes = [".local", ".internal", ".corp", ".lan", ".home.arpa", ".intranet"];
  if (domain === "localhost" || blockedSuffixes.some((s) => domain.endsWith(s))) {
    throw createError({ statusCode: 400, statusMessage: "Internal domains are not allowed" });
  }

  try {
    const records = await dns.promises.resolveTxt(domain);
    return {
      domain,
      records: {
        txt: records.flat(),
      },
    };
  } catch (err: unknown) {
    // NXDOMAIN or other lookup failures
    const code = err instanceof Error && "code" in err ? (err as { code: string }).code : undefined;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return {
        domain,
        records: { txt: [] },
      };
    }
    throw createError({
      statusCode: 502,
      statusMessage: "DNS lookup failed",
    });
  }
});
