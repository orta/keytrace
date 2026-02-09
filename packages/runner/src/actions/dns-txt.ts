/**
 * Perform a DNS TXT record lookup for a domain.
 * Node only - throws a descriptive error in browser environments.
 */
export async function dnsTxt(domain: string): Promise<string[]> {
  let dns: typeof import("node:dns/promises");
  try {
    dns = await import("node:dns/promises");
  } catch {
    throw new Error("DNS TXT lookups are not available in the browser. " + "Use the server-side proxy endpoint (POST /api/proxy/dns) instead.");
  }

  const records = await dns.resolveTxt(domain);
  // resolveTxt returns string[][] - flatten to string[]
  return records.map((chunks) => chunks.join(""));
}
