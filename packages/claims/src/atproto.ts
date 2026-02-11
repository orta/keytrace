import type { ClaimRecord, KeyRecord, VerifyOptions } from "./types.js";
import { PUBLIC_API_URL, PLC_DIRECTORY_URL, COLLECTION_NSID, DEFAULT_TIMEOUT } from "./constants.js";

interface DidDocument {
  id: string;
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

interface ListRecordsResponse {
  records: Array<{
    uri: string;
    cid: string;
    value: unknown;
  }>;
  cursor?: string;
}

interface GetRecordResponse {
  uri: string;
  cid: string;
  value: unknown;
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, options?: VerifyOptions): Promise<Response> {
  const fetchFn = options?.fetch ?? globalThis.fetch;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resolve a handle to a DID using the public ATProto API.
 */
export async function resolveHandle(handle: string, options?: VerifyOptions): Promise<string> {
  // If it's already a DID, return it
  if (handle.startsWith("did:")) {
    return handle;
  }

  const baseUrl = options?.publicApiUrl ?? PUBLIC_API_URL;
  const url = `${baseUrl}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;

  const response = await fetchWithTimeout(url, options);
  if (!response.ok) {
    throw new Error(`Failed to resolve handle: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { did: string };
  return data.did;
}

/**
 * Resolve the PDS endpoint from a DID document.
 */
export async function resolvePds(did: string, options?: VerifyOptions): Promise<string> {
  const plcUrl = options?.plcDirectoryUrl ?? PLC_DIRECTORY_URL;

  try {
    let url: string;
    if (did.startsWith("did:plc:")) {
      url = `${plcUrl}/${did}`;
    } else if (did.startsWith("did:web:")) {
      const host = did.replace("did:web:", "").replaceAll(":", "/");
      url = `https://${host}/.well-known/did.json`;
    } else {
      return PUBLIC_API_URL;
    }

    const response = await fetchWithTimeout(url, options);
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
 * List all keytrace claim records from a user's repo.
 */
export async function listClaimRecords(pdsUrl: string, did: string, options?: VerifyOptions): Promise<Array<{ uri: string; rkey: string; value: ClaimRecord }>> {
  const claims: Array<{ uri: string; rkey: string; value: ClaimRecord }> = [];

  try {
    let cursor: string | undefined;
    do {
      const url = new URL(`${pdsUrl}/xrpc/com.atproto.repo.listRecords`);
      url.searchParams.set("repo", did);
      url.searchParams.set("collection", COLLECTION_NSID);
      url.searchParams.set("limit", "100");
      if (cursor) url.searchParams.set("cursor", cursor);

      const response = await fetchWithTimeout(url.toString(), options);
      if (!response.ok) {
        // No records or repo not found
        if (response.status === 400 || response.status === 404) {
          break;
        }
        throw new Error(`Failed to list records: ${response.status}`);
      }

      const data = (await response.json()) as ListRecordsResponse;

      for (const record of data.records) {
        const rkey = parseAtUriRkey(record.uri);
        claims.push({
          uri: record.uri,
          rkey,
          value: record.value as ClaimRecord,
        });
      }

      cursor = data.cursor;
    } while (cursor);
  } catch (err) {
    // Silently handle errors - return whatever we got
    if (claims.length === 0) {
      throw err;
    }
  }

  return claims;
}

/**
 * Fetch a single record by AT URI.
 */
export async function getRecordByUri<T>(atUri: string, options?: VerifyOptions): Promise<T> {
  const match = atUri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid AT URI: ${atUri}`);
  }

  const [, repo, collection, rkey] = match;
  const pdsUrl = await resolvePds(repo, options);

  const url = new URL(`${pdsUrl}/xrpc/com.atproto.repo.getRecord`);
  url.searchParams.set("repo", repo);
  url.searchParams.set("collection", collection);
  url.searchParams.set("rkey", rkey);

  const response = await fetchWithTimeout(url.toString(), options);
  if (!response.ok) {
    throw new Error(`Failed to fetch record: ${response.status}`);
  }

  const data = (await response.json()) as GetRecordResponse;
  return data.value as T;
}

/**
 * Parse the rkey from an AT URI.
 */
function parseAtUriRkey(atUri: string): string {
  const match = atUri.match(/^at:\/\/[^/]+\/[^/]+\/(.+)$/);
  return match?.[1] ?? "";
}
