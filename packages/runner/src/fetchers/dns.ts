import { DEFAULT_TIMEOUT } from "../constants.js";

export interface DnsFetchResult {
  domain: string;
  records: {
    txt: string[];
  };
  /** Debug info showing which locations were checked */
  _locations?: {
    root: string[];
    _keytrace: string[];
  };
}

export interface DnsFetchOptions {
  timeout?: number;
}

/**
 * Check if the Node.js `dns` module is available.
 * This is more reliable than checking `typeof window` since SSR frameworks
 * and edge runtimes can have `window` defined or `dns` unavailable.
 */
async function hasDnsModule(): Promise<boolean> {
  try {
    await import("dns");
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch DNS TXT records for a domain.
 * Checks both the root domain and _keytrace subdomain.
 * Returns null in environments where DNS resolution is not available.
 */
export async function fetch(domain: string, options: DnsFetchOptions = {}): Promise<DnsFetchResult | null> {
  if (!(await hasDnsModule())) {
    console.debug("DNS fetching is not available in this environment");
    return null;
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT;

  try {
    const dns = await import("dns");
    const dnsPromises = dns.promises;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("DNS timeout")), timeout);
    });

    // Check both root domain and _keytrace subdomain
    const rootDomain = domain;
    const keytraceDomain = `_keytrace.${domain}`;

    const fetchPromise = Promise.all([
      dnsPromises.resolveTxt(rootDomain).catch(() => []),
      dnsPromises.resolveTxt(keytraceDomain).catch(() => []),
    ]).then(([rootRecords, keytraceRecords]) => ({
      domain,
      records: {
        txt: [...rootRecords.flat(), ...keytraceRecords.flat()],
      },
      // Include which locations were checked for debugging
      _locations: {
        root: rootRecords.flat(),
        _keytrace: keytraceRecords.flat(),
      },
    }));

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error) {
    if (error instanceof Error && error.message === "DNS timeout") {
      throw error;
    }
    // DNS lookup failed (NXDOMAIN, etc.)
    console.debug(`DNS lookup failed for ${domain}: ${error instanceof Error ? error.message : "Unknown error"}`);
    return null;
  }
}
