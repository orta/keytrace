import { DEFAULT_TIMEOUT } from "../constants.js";

export interface ActivityPubActor {
  id: string;
  type: string;
  preferredUsername?: string;
  name?: string;
  summary?: string;
  attachment?: Array<{
    type: string;
    name?: string;
    value?: string;
  }>;
  attributedTo?: string;
}

export interface ActivityPubFetchOptions {
  timeout?: number;
}

/**
 * Fetch an ActivityPub actor document
 */
export async function fetchActor(uri: string, options: ActivityPubFetchOptions = {}): Promise<ActivityPubActor> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await globalThis.fetch(uri, {
      headers: {
        Accept: 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
        "User-Agent": "keytrace-runner/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as ActivityPubActor;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch data from an ActivityPub URL (alias for http fetch with AP headers)
 */
export async function fetch(uri: string, options: ActivityPubFetchOptions = {}): Promise<unknown> {
  return fetchActor(uri, options);
}
