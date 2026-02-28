import { DEFAULT_TIMEOUT } from "../constants.js";
import * as cheerio from "cheerio";

export interface HttpFetchOptions {
  format: "json" | "text" | "json-ld";
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Fetch data from an HTTP/HTTPS URL
 */
export async function fetch(url: string, options: HttpFetchOptions): Promise<unknown> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await globalThis.fetch(url, {
      headers: {
        "User-Agent": "keytrace-runner/1.0",
        Accept: options.format === "json" ? "application/json" : "text/html",
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

    if (options.format === "json-ld") {
      const html = await response.text();
      const $ = cheerio.load(html);
      const jsonLdScript = $('script[type="application/ld+json"]').first();

      if (jsonLdScript.length === 0) {
        throw new Error('No JSON-LD script tag found in HTML');
      }

      const jsonLdText = jsonLdScript.text().trim();
      try {
        return JSON.parse(jsonLdText);
      } catch (err) {
        throw new Error(`Failed to parse JSON-LD: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}
