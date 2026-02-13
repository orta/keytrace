import type { VerifiedMessage } from "./types.js";

/** Regex matching did:plc:xxx or did:web:xxx */
const DID_PATTERN = /did:(plc|web):[a-zA-Z0-9._:%-]+/;

/** Interface for relay message storage backends */
export interface RelayStore {
  get(platform: string, username: string): Promise<VerifiedMessage | undefined>;
  put(platform: string, username: string, text: string): Promise<VerifiedMessage | undefined>;
  delete(platform: string, username: string): Promise<boolean>;
}

/**
 * In-memory store for verified DID messages.
 * Keyed by "platform:username" — latest message per user per platform wins.
 * Good for development and testing.
 */
export class MemoryStore implements RelayStore {
  private messages = new Map<string, VerifiedMessage>();

  private key(platform: string, username: string): string {
    return `${platform}:${username.toLowerCase()}`;
  }

  async put(platform: string, username: string, text: string): Promise<VerifiedMessage | undefined> {
    const did = extractDid(text);
    if (!did) return undefined;

    const msg: VerifiedMessage = {
      platform,
      username,
      did,
      timestamp: Date.now(),
      raw: text,
    };
    this.messages.set(this.key(platform, username), msg);
    return msg;
  }

  async get(platform: string, username: string): Promise<VerifiedMessage | undefined> {
    return this.messages.get(this.key(platform, username));
  }

  async delete(platform: string, username: string): Promise<boolean> {
    return this.messages.delete(this.key(platform, username));
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
 * Each message is stored as a separate JSON object at relay/{platform}/{username}.json
 */
export class JsonStore implements RelayStore {
  constructor(
    private load: <T>(key: string) => Promise<T | null>,
    private save: <T>(key: string, data: T) => Promise<void>,
    private del: (key: string) => Promise<void>,
  ) {}

  private key(platform: string, username: string): string {
    return `relay/${platform}/${username.toLowerCase()}.json`;
  }

  async put(platform: string, username: string, text: string): Promise<VerifiedMessage | undefined> {
    const did = extractDid(text);
    if (!did) return undefined;

    const msg: VerifiedMessage = {
      platform,
      username,
      did,
      timestamp: Date.now(),
      raw: text,
    };
    await this.save(this.key(platform, username), msg);
    return msg;
  }

  async get(platform: string, username: string): Promise<VerifiedMessage | undefined> {
    const msg = await this.load<VerifiedMessage>(this.key(platform, username));
    return msg ?? undefined;
  }

  async delete(platform: string, username: string): Promise<boolean> {
    try {
      await this.del(this.key(platform, username));
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
