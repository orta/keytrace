/** A verified DID message received from a chat platform via Matterbridge */
export interface VerifiedMessage {
  /** Platform identifier (e.g., "telegram", "signal", "discord") */
  platform: string;
  /** Sender's username on that platform (display name, may change) */
  username: string;
  /** Platform-native stable ID (Signal UUID, Telegram numeric ID, Discord snowflake, etc.) */
  userid?: string;
  /** Extracted DID (did:plc:xxx or did:web:xxx) */
  did: string;
  /** Unix timestamp (ms) when the message was received */
  timestamp: number;
  /** Full message text */
  raw?: string;
}
