import { loadJson, saveJson } from "./storage";

export interface RecentClaimIdentity {
  subject: string;
  avatarUrl?: string;
  profileUrl?: string;
  displayName?: string;
}

export interface RecentClaim {
  did: string;
  handle: string;
  avatar?: string;
  type: string;
  subject: string;
  displayName: string;
  createdAt: string;
  identity?: RecentClaimIdentity;
}

const FEED_KEY = "recent-claims.json";
const MAX_ITEMS = 50;

// Track last known feed size to detect unexpected empty reads
let lastKnownFeedSize = 0;

/**
 * Add a claim to the recent claims feed.
 * Prepends to the list, trims to 50 items, and saves.
 * Includes safeguard against S3 read failures that would wipe the feed.
 */
export async function addRecentClaim(claim: RecentClaim): Promise<void> {
  const feed = await getRecentClaims();

  // Safeguard: if we previously had data but now read empty, S3 may have failed
  // Don't overwrite - log warning and skip save to prevent data loss
  if (feed.length === 0 && lastKnownFeedSize > 5) {
    console.warn(
      `[recent-claims] Read returned empty but last known size was ${lastKnownFeedSize}. ` +
        `Skipping save to prevent data loss. New claim not added: ${claim.subject}`,
    );
    return;
  }

  // Deduplicate: remove any existing entry for the same DID + type + subject
  const dupeIdx = feed.findIndex((c) => c.did === claim.did && c.type === claim.type && c.subject === claim.subject);
  if (dupeIdx >= 0) feed.splice(dupeIdx, 1);

  feed.unshift(claim);
  if (feed.length > MAX_ITEMS) feed.length = MAX_ITEMS;
  lastKnownFeedSize = feed.length;
  await saveJson(FEED_KEY, feed);
}

/**
 * Get the recent claims feed from storage.
 */
export async function getRecentClaims(): Promise<RecentClaim[]> {
  const feed = (await loadJson<RecentClaim[]>(FEED_KEY)) ?? [];
  if (feed.length > 0) {
    lastKnownFeedSize = feed.length;
  }
  return feed;
}
