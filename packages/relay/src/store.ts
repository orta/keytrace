import type { VerifiedMessage } from "./types.js";

/** Regex matching did:plc:xxx or did:web:xxx */
const DID_PATTERN = /did:(plc|web):[a-zA-Z0-9._:%-]+/;

/** Interface for relay message storage backends */
export interface RelayStore {
  get(platform: string, identifier: string): Promise<VerifiedMessage | undefined>;
  put(platform: string, username: string, did: string, userid?: string): Promise<VerifiedMessage | undefined>;
  delete(platform: string, identifier: string): Promise<boolean>;
}

/**
 * In-memory store for verified DID messages.
 * Stores under both userid and username keys when userid is available,
 * so lookups work by either identifier.
 */
export class MemoryStore implements RelayStore {
  private messages = new Map<string, VerifiedMessage>();

  private key(platform: string, identifier: string): string {
    return `${platform}:${identifier.toLowerCase()}`;
  }

  async put(platform: string, username: string, did: string, userid?: string): Promise<VerifiedMessage | undefined> {
    const validDid = extractDid(did);
    if (!validDid) return undefined;

    const msg: VerifiedMessage = {
      platform,
      username,
      userid,
      did: validDid,
      timestamp: Date.now(),
    };
    // Always store under userid if available
    const primaryKey = this.key(platform, userid ?? username);
    this.messages.set(primaryKey, msg);
    // Also store under username so lookups by either work
    if (userid) {
      this.messages.set(this.key(platform, username), msg);
    }
    return msg;
  }

  async get(platform: string, identifier: string): Promise<VerifiedMessage | undefined> {
    return this.messages.get(this.key(platform, identifier));
  }

  async delete(platform: string, identifier: string): Promise<boolean> {
    return this.messages.delete(this.key(platform, identifier));
  }

  /** Number of stored messages */
  get size(): number {
    return this.messages.size;
  }

  /** Clear all stored messages */
  clear(): void {
    this.messages.clear();
  }
}

/**
 * JSON-file/S3 store for verified DID messages.
 * Uses a loadJson/saveJson abstraction so it works with both local files and S3.
 * Stores under relay/{platform}/{userid}.json when userid is available,
 * with a copy at relay/{platform}/{username}.json for lookup by either.
 */
export class JsonStore implements RelayStore {
  constructor(
    private load: <T>(key: string) => Promise<T | null>,
    private save: <T>(key: string, data: T) => Promise<void>,
    private del: (key: string) => Promise<void>,
  ) {}

  private path(platform: string, identifier: string): string {
    return `relay/${platform}/${identifier.toLowerCase()}.json`;
  }

  async put(platform: string, username: string, did: string, userid?: string): Promise<VerifiedMessage | undefined> {
    const validDid = extractDid(did);
    if (!validDid) return undefined;

    const msg: VerifiedMessage = {
      platform,
      username,
      userid,
      did: validDid,
      timestamp: Date.now(),
    };
    const primaryId = userid ?? username;
    await this.save(this.path(platform, primaryId), msg);
    // Also write under username so lookups by either work
    if (userid) {
      await this.save(this.path(platform, username), msg);
    }
    return msg;
  }

  async get(platform: string, identifier: string): Promise<VerifiedMessage | undefined> {
    const msg = await this.load<VerifiedMessage>(this.path(platform, identifier));
    return msg ?? undefined;
  }

  async delete(platform: string, identifier: string): Promise<boolean> {
    try {
      await this.del(this.path(platform, identifier));
      return true;
    } catch {
      return false;
    }
  }
}

/** Extract the first DID from a text string, or undefined if none found */
export function extractDid(text: string): string | undefined {
  const match = text.match(DID_PATTERN);
  return match?.[0];
}

/** Extract the platform name from a Matterbridge account string (e.g., "telegram.keytrace" → "telegram") */
export function extractPlatform(account: string): string {
  const dot = account.indexOf(".");
  return dot === -1 ? account : account.slice(0, dot);
}
