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
  attributedTo?: string | { preferredUsername?: string; name?: string; icon?: { url?: string } };
  content?: string;
}

export interface ActivityPubFetchOptions {
  timeout?: number;
}

// Matches profile or status URLs: https://instance/@user or https://instance/@user/123
const MASTODON_URL_RE = /^https:\/\/([^/]+)\/@([^/]+?)(?:\/(\d+))?\/?$/;

interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name?: string;
  note?: string;
  avatar?: string;
  fields?: Array<{ name: string; value: string }>;
}

interface MastodonStatus {
  id: string;
  content: string;
  account: MastodonAccount;
}

/**
 * Normalize a Mastodon API account into the ActivityPub actor shape
 * that the service provider expects.
 */
function accountToActor(account: MastodonAccount, domain: string): ActivityPubActor {
  return {
    id: `https://${domain}/users/${account.username}`,
    type: "Person",
    preferredUsername: account.username,
    name: account.display_name || account.username,
    summary: account.note,
    attachment: account.fields?.map((f) => ({
      type: "PropertyValue",
      name: f.name,
      value: f.value,
    })),
  };
}

/**
 * Normalize a Mastodon API status into the ActivityPub object shape
 * that the service provider expects.
 */
function statusToObject(status: MastodonStatus, domain: string): ActivityPubActor {
  return {
    id: `https://${domain}/statuses/${status.id}`,
    type: "Note",
    content: status.content,
    attributedTo: {
      preferredUsername: status.account.username,
      name: status.account.display_name || status.account.username,
      icon: status.account.avatar ? { url: status.account.avatar } : undefined,
    },
  };
}

async function mastodonFetch(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await globalThis.fetch(url, {
      headers: { "User-Agent": "keytrace-runner/1.0" },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch an ActivityPub actor/object using the Mastodon REST API.
 *
 * Many instances enable "authorized fetch" (secure mode), which rejects
 * unsigned ActivityPub requests. The Mastodon REST API doesn't require
 * HTTP Signatures, so we use it as the primary fetch strategy.
 */
export async function fetchActor(uri: string, options: ActivityPubFetchOptions = {}): Promise<ActivityPubActor> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const match = MASTODON_URL_RE.exec(uri);

  if (!match) {
    throw new Error(`Cannot parse Mastodon URL: ${uri}`);
  }

  const [, domain, username, statusId] = match;

  if (statusId) {
    // Status fetch: GET /api/v1/statuses/:id
    const response = await mastodonFetch(
      `https://${domain}/api/v1/statuses/${statusId}`,
      timeout,
    );
    if (!response.ok) {
      throw new Error(`Mastodon API HTTP ${response.status}: ${response.statusText}`);
    }
    const status = (await response.json()) as MastodonStatus;
    return statusToObject(status, domain);
  } else {
    // Profile fetch: GET /api/v1/accounts/lookup?acct=username
    const response = await mastodonFetch(
      `https://${domain}/api/v1/accounts/lookup?acct=${encodeURIComponent(username)}`,
      timeout,
    );
    if (!response.ok) {
      throw new Error(`Mastodon API HTTP ${response.status}: ${response.statusText}`);
    }
    const account = (await response.json()) as MastodonAccount;
    return accountToActor(account, domain);
  }
}

/**
 * Fetch data from an ActivityPub URL via the Mastodon REST API
 */
export async function fetch(uri: string, options: ActivityPubFetchOptions = {}): Promise<unknown> {
  return fetchActor(uri, options);
}
