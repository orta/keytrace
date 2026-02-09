import { AtpAgent } from "@atproto/api";
import { createClaim, verifyClaim, type ClaimState } from "./claim.js";
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
 * A fetched profile with resolved claims
 */
export interface FetchedProfile extends ProfileData {
  claims: ClaimData[];
  claimInstances: ClaimState[];
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
    const pdsService = doc.service?.find((s) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer");

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
 * Internal: fetch profile data using an already-configured agent
 */
async function fetchWithAgent(agent: AtpAgent, did: string): Promise<FetchedProfile> {
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

  return {
    did,
    handle: bskyProfile?.handle ?? did,
    displayName: bskyProfile?.displayName,
    avatar: bskyProfile?.avatar,
    claims,
    claimInstances: claims.map((c) => createClaim(c.uri, did)),
  };
}

/**
 * Fetch a profile from ATProto by DID or handle
 */
export async function fetchProfile(didOrHandle: string, serviceUrl?: string): Promise<FetchedProfile> {
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
        return fetchWithAgent(pdsAgent, did);
      }
    }
  }

  return fetchWithAgent(agent, did);
}

/**
 * Verify all claims in a profile
 */
export async function verifyAllClaims(profile: FetchedProfile, opts?: VerifyOptions): Promise<void> {
  await Promise.all(profile.claimInstances.map((claim) => verifyClaim(claim, opts)));
}

/**
 * Get verification summary for a profile
 */
export function getProfileSummary(profile: FetchedProfile): {
  total: number;
  verified: number;
  failed: number;
  pending: number;
} {
  const claims = profile.claimInstances;
  return {
    total: claims.length,
    verified: claims.filter((c) => c.status === ClaimStatus.VERIFIED).length,
    failed: claims.filter((c) => c.status === ClaimStatus.FAILED || c.status === ClaimStatus.ERROR).length,
    pending: claims.filter((c) => c.status === ClaimStatus.INIT || c.status === ClaimStatus.MATCHED).length,
  };
}

/**
 * Get claims grouped by status
 */
export function getClaimsByStatus(profile: FetchedProfile): {
  verified: ClaimState[];
  failed: ClaimState[];
  pending: ClaimState[];
} {
  const claims = profile.claimInstances;
  return {
    verified: claims.filter((c) => c.status === ClaimStatus.VERIFIED),
    failed: claims.filter((c) => c.status === ClaimStatus.FAILED || c.status === ClaimStatus.ERROR),
    pending: claims.filter((c) => c.status === ClaimStatus.INIT || c.status === ClaimStatus.MATCHED),
  };
}
