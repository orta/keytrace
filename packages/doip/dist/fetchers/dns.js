import { DEFAULT_TIMEOUT } from "../constants.js";
/**
 * Check if the Node.js `dns` module is available.
 * This is more reliable than checking `typeof window` since SSR frameworks
 * and edge runtimes can have `window` defined or `dns` unavailable.
 */
async function hasDnsModule() {
    try {
        await import("dns");
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Fetch DNS TXT records for a domain.
 * Returns null in environments where DNS resolution is not available.
 */
export async function fetch(domain, options = {}) {
    if (!(await hasDnsModule())) {
        console.debug("DNS fetching is not available in this environment");
        return null;
    }
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    try {
        const dns = await import("dns");
        const dnsPromises = dns.promises;
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("DNS timeout")), timeout);
        });
        const fetchPromise = dnsPromises.resolveTxt(domain).then((records) => ({
            domain,
            records: {
                txt: records.flat(),
            },
        }));
        return await Promise.race([fetchPromise, timeoutPromise]);
    }
    catch (error) {
        if (error instanceof Error && error.message === "DNS timeout") {
            throw error;
        }
        // DNS lookup failed (NXDOMAIN, etc.)
        console.debug(`DNS lookup failed for ${domain}: ${error instanceof Error ? error.message : "Unknown error"}`);
        return null;
    }
}
//# sourceMappingURL=dns.js.map