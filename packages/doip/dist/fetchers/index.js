import * as http from "./http.js";
import * as dns from "./dns.js";
import * as activitypub from "./activitypub.js";
const fetchers = {
    http,
    dns,
    activitypub,
};
/**
 * Get a fetcher by name
 */
export function get(name) {
    return fetchers[name];
}
/**
 * Get all available fetchers
 */
export function getAll() {
    return { ...fetchers };
}
export { http, dns, activitypub };
//# sourceMappingURL=index.js.map