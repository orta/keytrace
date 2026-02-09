import * as http from "./http.js";
import * as dns from "./dns.js";
import * as activitypub from "./activitypub.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Fetcher {
  fetch: (uri: string, options?: any) => Promise<unknown>;
}

const fetchers: Record<string, Fetcher> = {
  http,
  dns,
  activitypub,
};

/**
 * Get a fetcher by name
 */
export function get(name: string): Fetcher | undefined {
  return fetchers[name];
}

/**
 * Get all available fetchers
 */
export function getAll(): Record<string, Fetcher> {
  return { ...fetchers };
}

export { http, dns, activitypub };
