import { DEFAULT_TIMEOUT } from "../constants.js";
/**
 * Fetch data from an HTTP/HTTPS URL
 */
export async function fetch(url, options) {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await globalThis.fetch(url, {
            headers: {
                "User-Agent": "keytrace-doip/1.0",
                Accept: options.format === "json" ? "application/json" : "text/plain",
                ...options.headers,
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        if (options.format === "json") {
            return await response.json();
        }
        return await response.text();
    }
    finally {
        clearTimeout(timeoutId);
    }
}
//# sourceMappingURL=http.js.map