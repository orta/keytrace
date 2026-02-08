import { AtpAgent } from "@atproto/api";
import { Claim } from "./claim.js";
import { ClaimStatus } from "./types.js";
import { COLLECTION_NSID, PUBLIC_API_URL, PLC_DIRECTORY_URL } from "./constants.js";
import type { ProfileData, ClaimData, VerifyOptions } from "./types.js";

/**
 * DID document service entry
 */
interface DidService {
  id: string;
  type: string;
  serviceEndpoint: string;
}

/**
 * DID document shape (subset of fields we need)
 */
interface DidDocument {
  id: string;
  service?: DidService[];
}

/**
 * Resolve the PDS endpoint from a DID document.
 * For did:plc, fetches from plc.directory.
 * For did:web, fetches from the well-known DID path.
 * Falls back to PUBLIC_API_URL on failure.
 */
export async function resolvePds(did: string): Promise<string> {
  try {
    let url: string;
    if (did.startsWith("did:plc:")) {
      url = `${PLC_DIRECTORY_URL}/${did}`;
    } else if (did.startsWith("did:web:")) {
      const host = did.replace("did:web:", "").replaceAll(":", "/");
      url = `https://${host}/.well-known/did.json`;
    } else {
      return PUBLIC_API_URL;
    }

    const response = await globalThis.fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return PUBLIC_API_URL;
    }

    const doc = (await response.json()) as DidDocument;
    const pdsService = doc.service?.find(
      (s) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer",
    );

    return pdsService?.serviceEndpoint ?? PUBLIC_API_URL;
  } catch {
    return PUBLIC_API_URL;
  }
}

/**
 * Parse an AT URI and extract the rkey (record key).
 * AT URIs have the format: at://did/collection/rkey
 */
function parseAtUriRkey(atUri: string): string {
  const match = atUri.match(/^at:\/\/[^/]+\/[^/]+\/(.+)$/);
  return match?.[1] ?? "";
}

/**
 * Represents a user profile with identity claims from ATProto
 */
export class Profile {
  private _did: string;
  private _handle: string;
  private _displayName?: string;
  private _avatar?: string;
  private _claims: Claim[] = [];
  private _claimRecords: ClaimData[] = [];

  private constructor(data: ProfileData) {
    this._did = data.did;
    this._handle = data.handle;
    this._displayName = data.displayName;
    this._avatar = data.avatar;
    this._claimRecords = data.claims;
    this._claims = data.claims.map((c) => new Claim(c.uri, data.did));
  }

  get did(): string {
    return this._did;
  }

  get handle(): string {
    return this._handle;
  }

  get displayName(): string | undefined {
    return this._displayName;
  }

  get avatar(): string | undefined {
    return this._avatar;
  }

  get claims(): Claim[] {
    return this._claims;
  }

  get claimRecords(): ClaimData[] {
    return this._claimRecords;
  }

  /**
   * Fetch a profile from ATProto by DID or handle
   */
  static async fetch(didOrHandle: string, serviceUrl?: string): Promise<Profile> {
    // Resolve PDS from DID document unless an explicit serviceUrl was provided
    let resolvedServiceUrl: string;
    let did = didOrHandle;

    if (serviceUrl) {
      resolvedServiceUrl = serviceUrl;
    } else if (didOrHandle.startsWith("did:")) {
      resolvedServiceUrl = await resolvePds(didOrHandle);
    } else {
      // Handle - we need to resolve via the public API first, then resolve PDS
      resolvedServiceUrl = PUBLIC_API_URL;
    }

    const agent = new AtpAgent({ service: resolvedServiceUrl });

    // Resolve handle to DID if needed
    if (!didOrHandle.startsWith("did:")) {
      const resolved = await agent.resolveHandle({ handle: didOrHandle });
      did = resolved.data.did;

      // Now that we have the DID, resolve the actual PDS if no explicit serviceUrl
      if (!serviceUrl) {
        const pdsUrl = await resolvePds(did);
        if (pdsUrl !== resolvedServiceUrl) {
          resolvedServiceUrl = pdsUrl;
          // Re-create agent pointed at the user's actual PDS
          const pdsAgent = new AtpAgent({ service: pdsUrl });
          return Profile._fetchWithAgent(pdsAgent, did);
        }
      }
    }

    return Profile._fetchWithAgent(agent, did);
  }

  /**
   * Internal: fetch profile data using an already-configured agent
   */
  private static async _fetchWithAgent(agent: AtpAgent, did: string): Promise<Profile> {
    // Fetch Bluesky profile for display info via public API (not PDS)
    // The PDS doesn't serve app.bsky.actor.getProfile - only the AppView does
    let bskyProfile: { handle: string; displayName?: string; avatar?: string } | null = null;
    try {
      const publicAgent = new AtpAgent({ service: PUBLIC_API_URL });
      const profileRes = await publicAgent.getProfile({ actor: did });
      bskyProfile = {
        handle: profileRes.data.handle,
        displayName: profileRes.data.displayName,
        avatar: profileRes.data.avatar,
      };
    } catch (err: unknown) {
      // Profile fetch is optional - user may not have a Bluesky profile
      // 404 is expected; log other errors at debug level
      if (err instanceof Error && !err.message.includes("404")) {
        console.debug(`Failed to fetch profile for ${did}: ${err.message}`);
      }
    }

    // List all claim records with cursor-based pagination
    const claims: ClaimData[] = [];
    try {
      let cursor: string | undefined;
      do {
        const records = await agent.com.atproto.repo.listRecords({
          repo: did,
          collection: COLLECTION_NSID,
          limit: 100,
          cursor,
        });

        for (const record of records.data.records) {
          const value = record.value as {
            claimUri?: string;
            comment?: string;
            createdAt?: string;
          };
          if (value.claimUri) {
            claims.push({
              uri: value.claimUri,
              did,
              comment: value.comment,
              createdAt: value.createdAt ?? new Date().toISOString(),
              rkey: parseAtUriRkey(record.uri),
            });
          }
        }

        cursor = records.data.cursor;
      } while (cursor);
    } catch (err: unknown) {
      // 404 means no records yet; log other errors
      if (err instanceof Error && !err.message.includes("404")) {
        console.debug(`Failed to list claim records for ${did}: ${err.message}`);
      }
    }

    return new Profile({
      did,
      handle: bskyProfile?.handle ?? did,
      displayName: bskyProfile?.displayName,
      avatar: bskyProfile?.avatar,
      claims,
    });
  }

  /**
   * Verify all claims in this profile
   */
  async verifyAll(opts?: VerifyOptions): Promise<void> {
    await Promise.all(this._claims.map((claim) => claim.verify(opts)));
  }

  /**
   * Get verification summary
   */
  getSummary(): {
    total: number;
    verified: number;
    failed: number;
    pending: number;
  } {
    return {
      total: this._claims.length,
      verified: this._claims.filter((c) => c.status === ClaimStatus.VERIFIED).length,
      failed: this._claims.filter(
        (c) => c.status === ClaimStatus.FAILED || c.status === ClaimStatus.ERROR,
      ).length,
      pending: this._claims.filter(
        (c) => c.status === ClaimStatus.INIT || c.status === ClaimStatus.MATCHED,
      ).length,
    };
  }

  /**
   * Get claims grouped by status
   */
  getClaimsByStatus(): {
    verified: Claim[];
    failed: Claim[];
    pending: Claim[];
  } {
    return {
      verified: this._claims.filter((c) => c.status === ClaimStatus.VERIFIED),
      failed: this._claims.filter(
        (c) => c.status === ClaimStatus.FAILED || c.status === ClaimStatus.ERROR,
      ),
      pending: this._claims.filter(
        (c) => c.status === ClaimStatus.INIT || c.status === ClaimStatus.MATCHED,
      ),
    };
  }

  toJSON(): ProfileData {
    return {
      did: this._did,
      handle: this._handle,
      displayName: this._displayName,
      avatar: this._avatar,
      claims: this._claimRecords,
    };
  }
}
