import * as http from "./http.js";
import * as dns from "./dns.js";
import * as activitypub from "./activitypub.js";
export interface Fetcher {
    fetch: (uri: string, options?: any) => Promise<unknown>;
}
/**
 * Get a fetcher by name
 */
export declare function get(name: string): Fetcher | undefined;
/**
 * Get all available fetchers
 */
export declare function getAll(): Record<string, Fetcher>;
export { http, dns, activitypub };
//# sourceMappingURL=index.d.ts.map