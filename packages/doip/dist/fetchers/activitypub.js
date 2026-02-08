import { DEFAULT_TIMEOUT } from "../constants.js";
/**
 * Fetch an ActivityPub actor document
 */
export async function fetchActor(uri, options = {}) {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await globalThis.fetch(uri, {
            headers: {
                Accept: 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
                "User-Agent": "keytrace-doip/1.0",
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return (await response.json());
    }
    finally {
        clearTimeout(timeoutId);
    }
}
/**
 * Fetch data from an ActivityPub URL (alias for http fetch with AP headers)
 */
export async function fetch(uri, options = {}) {
    return fetchActor(uri, options);
}
//# sourceMappingURL=activitypub.js.map