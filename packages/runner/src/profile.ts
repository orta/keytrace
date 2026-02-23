import { AtpAgent } from "@atproto/api";
import { createClaim, verifyClaim, type ClaimState } from "./claim.js";
import { ClaimStatus } from "./types.js";
import { COLLECTION_NSID, PUBLIC_API_URL, PLC_DIRECTORY_URL } from "./constants.js";
import type { ProfileData, ClaimData, VerifyOptions, IdentityMetadata, ProfileOptions } from "./types.js";

/** Default trusted signer handles */
const DEFAULT_TRUSTED_SIGNERS = ["keytrace.dev"];

/** Find the attestation sig (kid starting with "attest:"), falling back to first sig or legacy sig */
function getAttestSrc(sigs?: Array<{ kid?: string; src?: string }>, sig?: { src?: string }): string | undefined {
  const attest = sigs?.find((s) => s.kid?.startsWith("attest:"));
  return attest?.src ?? sigs?.[0]?.src ?? sig?.src;
}

/**
 * Extract the DID from an AT URI (at://did/collection/rkey)
 */
function extractDidFromAtUri(atUri: string): string | null {
  const match = atUri.match(/^at:\/\/([^/]+)\//);
  return match?.[1] ?? null;
}

/**
 * Resolve an array of handles to their DIDs via the public API.
 */
async function resolveTrustedDids(handles: string[]): Promise<Set<string>> {
  const dids = new Set<string>();
  const publicAgent = new AtpAgent({ service: PUBLIC_API_URL });
  await Promise.all(
    handles.map(async (handle) => {
      try {
        const resolved = await publicAgent.resolveHandle({ handle });
        dids.add(resolved.data.did);
      } catch {
        console.debug(`[runner] Failed to resolve trusted signer handle: ${handle}`);
      }
    }),
  );
  return dids;
}

/**
 * Check whether a claim's signing key is from a trusted signer.
 * Returns an error message if untrusted, or null if trusted.
 */
function checkSignerTrust(sigSrc: string | undefined, trustedDids: Set<string>): string | null {
  if (!sigSrc) {
    return "Claim has no signing key reference";
  }
  const signerDid = extractDidFromAtUri(sigSrc);
  if (!signerDid) {
    return `Invalid signing key URI: ${sigSrc}`;
  }
  if (!trustedDids.has(signerDid)) {
    return `Signing key is not from a trusted signer (DID: ${signerDid})`;
  }
  return null;
}

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
async function fetchWithAgent(agent: AtpAgent, did: string, opts?: ProfileOptions): Promise<FetchedProfile> {
  const trustedSigners = opts?.trustedSigners ?? DEFAULT_TRUSTED_SIGNERS;
  const trustedDids = await resolveTrustedDids(trustedSigners);

  // Fetch Bluesky profile for display info via public API (not PDS)
  // The PDS doesn't serve app.bsky.actor.getProfile - only the AppView does
  let bskyProfile: { handle: string; displayName?: string; description?: string; avatar?: string } | null = null;
  try {
    const publicAgent = new AtpAgent({ service: PUBLIC_API_URL });
    const profileRes = await publicAgent.getProfile({ actor: did });
    bskyProfile = {
      handle: profileRes.data.handle,
      displayName: profileRes.data.displayName,
      description: profileRes.data.description,
      avatar: profileRes.data.avatar,
    };
  } catch (err: unknown) {
    // Profile fetch is optional - user may not have a Bluesky profile
    // 404 is expected; log other errors at debug level
    if (err instanceof Error && !err.message.includes("404")) {
      console.debug(`Failed to fetch profile for ${did}: ${err.message}`);
    }
  }

  // Fetch keytrace profile record (dev.keytrace.profile/self) for bio/displayName overrides
  let ktProfile: { displayName?: string; bio?: string } | null = null;
  try {
    const record = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: "dev.keytrace.profile",
      rkey: "self",
    });
    const value = record.data.value as { displayName?: string; bio?: string };
    ktProfile = value;
  } catch {
    // No keytrace profile record — that's fine
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
          type?: string;
          comment?: string;
          createdAt?: string;
          identity?: IdentityMetadata;
          sig?: { src?: string };
          sigs?: Array<{ kid?: string; src?: string }>;
          status?: "verified" | "failed" | "retracted";
          lastVerifiedAt?: string;
          failedAt?: string;
        };
        if (value.claimUri) {
          claims.push({
            uri: value.claimUri,
            did,
            type: value.type,
            comment: value.comment,
            createdAt: value.createdAt ?? new Date().toISOString(),
            rkey: parseAtUriRkey(record.uri),
            identity: value.identity,
            sig: value.sigs?.find((s) => s.kid?.startsWith("attest:")) ?? value.sigs?.[0] ?? value.sig,
            sigs: value.sigs,
            status: value.status,
            lastVerifiedAt: value.lastVerifiedAt,
            failedAt: value.failedAt,
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

  // Build claim instances, marking untrusted signers as FAILED
  const claimInstances = claims.map((c) => {
    const state = createClaim(c.uri, did);
    const trustError = checkSignerTrust(getAttestSrc(c.sigs, c.sig), trustedDids);
    if (trustError) {
      state.status = ClaimStatus.FAILED;
      state.errors.push(trustError);
    }
    return state;
  });

  return {
    did,
    handle: bskyProfile?.handle ?? did,
    displayName: ktProfile?.displayName || bskyProfile?.displayName,
    description: ktProfile?.bio || bskyProfile?.description,
    avatar: bskyProfile?.avatar,
    claims,
    claimInstances,
  };
}

/**
 * Fetch a profile from ATProto by DID or handle
 */
export async function fetchProfile(didOrHandle: string, opts?: ProfileOptions): Promise<FetchedProfile> {
  const serviceUrl = opts?.serviceUrl;

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
        return fetchWithAgent(pdsAgent, did, opts);
      }
    }
  }

  return fetchWithAgent(agent, did, opts);
}

/**
 * Verify all claims in a profile.
 * Claims whose signing key is not from a trusted signer are marked as FAILED
 * without running proof verification.
 */
export async function verifyAllClaims(profile: FetchedProfile, opts?: VerifyOptions): Promise<void> {
  const trustedSigners = opts?.trustedSigners ?? DEFAULT_TRUSTED_SIGNERS;
  const trustedDids = await resolveTrustedDids(trustedSigners);

  await Promise.all(
    profile.claimInstances.map(async (claim, i) => {
      // Skip claims already marked as failed (e.g. by fetchProfile signer check)
      if (claim.status === ClaimStatus.FAILED) return;

      // Check signing key provenance
      const claimData = profile.claims[i];
      const trustError = checkSignerTrust(claimData ? getAttestSrc(claimData.sigs, claimData.sig) : undefined, trustedDids);
      if (trustError) {
        claim.status = ClaimStatus.FAILED;
        claim.errors.push(trustError);
        return;
      }

      await verifyClaim(claim, opts);
    }),
  );
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
