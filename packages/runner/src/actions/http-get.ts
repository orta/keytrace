import type { FetchFn } from "../types.js";

/**
 * Fetch a URL using the injected fetch function and return the response body as text.
 */
export async function httpGet(url: string, fetchFn: FetchFn, timeout?: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
