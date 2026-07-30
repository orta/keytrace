import type { VerifyOptions } from "./types.js";
import { fetchWithTimeout } from "./atproto.js";
import { KEYTRACE_SERVICE_URL } from "./constants.js";

const REVERSE_LOOKUP_NSID = "dev.keytrace.reverseLookup";

/**
 * Known claim types the reverseLookup index recognises. Mirrors
 * `dev.keytrace.claim#type` — keep in sync when adding a new provider. Any
 * other string is still accepted, but the server may reject it as UnknownType.
 */
export type ReverseLookupType =
  | "github"
  | "dns"
  | "activitypub"
  | "bsky"
  | "npm"
  | "tangled"
  | "pgp"
  | "twitter"
  | "linkedin"
  | "instagram"
  | "reddit"
  | "hackernews"
  | "orcid"
  | "itchio"
  | "discord"
  | (string & {});

/**
 * A single account that has verifiably claimed the looked-up identity.
 * Mirrors `dev.keytrace.reverseLookup#match`.
 */
export interface ReverseLookupMatch {
  /** The DID of the ATProto account that made the claim. */
  did: string;
  /** The at-uri of the dev.keytrace.claim record backing this match. */
  claim: string;
  /** Timestamp the claim was most recently verified (lastVerifiedAt if present, otherwise createdAt). */
  verifiedAt: string;
  /**
   * Present (and true) only when the most recent re-verification attempt hit a
   * transient failure (e.g. key-fetch network error). The match is still based
   * on a prior successful verification, but callers who need strong freshness
   * guarantees may wish to re-verify the claim themselves. Absent when the most
   * recent check succeeded.
   */
  recheckSuggested?: boolean;
}

/**
 * Result of a reverse lookup. Mirrors the `dev.keytrace.reverseLookup` output.
 */
export interface ReverseLookupResult {
  /** Total number of matching claims. */
  total: number;
  matches: ReverseLookupMatch[];
}

/**
 * Options for {@link reverseLookup}. Extends {@link VerifyOptions} but only
 * `fetch`, `timeout`, and the new `serviceUrl` are used.
 */
export interface ReverseLookupOptions extends VerifyOptions {
  /** Base URL of the keytrace service hosting the XRPC (default: https://keytrace.dev) */
  serviceUrl?: string;
}

/**
 * Error thrown when the reverseLookup XRPC returns an error response. The
 * `code` field carries the XRPC error name (e.g. "UnknownType",
 * "InvalidRequest") so callers can branch on it.
 */
export class ReverseLookupError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ReverseLookupError";
  }
}

/**
 * Find the ATProto accounts that have verifiably claimed a given external
 * identity, keyed by claim type and subject.
 *
 * This queries the keytrace `dev.keytrace.reverseLookup` XRPC — the inverse of
 * {@link getClaimsForDid}: instead of "what has this DID claimed?", it answers
 * "who has claimed this identity?". Matching is exact (case-sensitive) on the
 * subject, and only non-retracted claims whose attestation signatures validate
 * against a known keytrace server key are returned.
 *
 * @param type The claim type (e.g. "github", "dns", "npm"). See {@link ReverseLookupType}.
 * @param subject The subject identifier being looked up (matched exactly).
 * @param options Optional configuration
 * @returns The matching claims
 * @throws {ReverseLookupError} If the server rejects the request (e.g. unknown type).
 */
export async function reverseLookup(type: ReverseLookupType, subject: string, options?: ReverseLookupOptions): Promise<ReverseLookupResult> {
  const baseUrl = options?.serviceUrl ?? KEYTRACE_SERVICE_URL;
  const url = new URL(`${baseUrl}/xrpc/${REVERSE_LOOKUP_NSID}`);
  url.searchParams.set("type", type);
  url.searchParams.set("subject", subject);

  const response = await fetchWithTimeout(url.toString(), options);

  if (!response.ok) {
    let code = "XRPCError";
    let message = `Reverse lookup failed: ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      if (body.error) code = body.error;
      if (body.message) message = body.message;
    } catch {
      // Non-JSON error body — fall back to the status-based message
    }
    throw new ReverseLookupError(code, message, response.status);
  }

  const data = (await response.json()) as ReverseLookupResult;
  return {
    total: data.total,
    matches: data.matches ?? [],
  };
}
