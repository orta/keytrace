import { ClaimStatus } from "./types.js";
import { DEFAULT_TIMEOUT } from "./constants.js";
import { matchUri, type ServiceProviderMatch, type ProofRequest, type ProofTarget } from "./serviceProviders/index.js";
import * as fetchers from "./fetchers/index.js";
import type { VerifyOptions, ClaimVerificationResult } from "./types.js";

// did:plc identifiers are base32-encoded, lowercase
const DID_PLC_RE = /^did:plc:[a-z2-7]{24}$/;
// did:web uses a domain name (with optional port and path segments encoded as colons)
const DID_WEB_RE = /^did:web:[a-zA-Z0-9._:%-]+$/;

/**
 * Validate a DID string. Accepts did:plc and did:web formats.
 */
export function isValidDid(did: string): boolean {
  return DID_PLC_RE.test(did) || DID_WEB_RE.test(did);
}

/**
 * A single identity claim linking a DID to an external account
 */
export interface ClaimState {
  uri: string;
  did: string;
  status: ClaimStatus;
  matches: ServiceProviderMatch[];
  errors: string[];
}

/**
 * Create a new claim state
 */
export function createClaim(uri: string, did: string): ClaimState {
  if (!isValidDid(did)) {
    throw new Error(`Invalid DID format: ${did}`);
  }
  return {
    uri,
    did,
    status: ClaimStatus.INIT,
    matches: [],
    errors: [],
  };
}

/**
 * Match the claim URI against known service providers
 */
export function matchClaim(claim: ClaimState): void {
  claim.matches = matchUri(claim.uri);
  claim.status = claim.matches.length > 0 ? ClaimStatus.MATCHED : ClaimStatus.ERROR;

  if (claim.matches.length === 0) {
    claim.errors.push(`No service provider matched URI: ${claim.uri}`);
  }
}

/**
 * Check if the claim is ambiguous (matches multiple providers)
 */
export function isClaimAmbiguous(claim: ClaimState): boolean {
  return claim.matches.length > 1 || (claim.matches.length === 1 && claim.matches[0].isAmbiguous);
}

/**
 * Get the matched service provider (first unambiguous match, or first match)
 */
export function getMatchedProvider(claim: ClaimState): ServiceProviderMatch | undefined {
  return claim.matches[0];
}

/**
 * Verify the claim by fetching proof and checking for DID
 */
export async function verifyClaim(claim: ClaimState, opts: VerifyOptions = {}): Promise<ClaimVerificationResult> {
  if (claim.status === ClaimStatus.INIT) {
    matchClaim(claim);
  }

  if (claim.matches.length === 0) {
    return {
      status: ClaimStatus.ERROR,
      errors: claim.errors,
      timestamp: new Date(),
    };
  }

  // Try each matched provider until one succeeds
  for (const match of claim.matches) {
    try {
      const config = match.provider.processURI(claim.uri, match.match);
      const proofData = await fetchProof(config.proof.request, opts);

      if (checkProof(proofData, config.proof.target, claim.did)) {
        claim.status = ClaimStatus.VERIFIED;
        return {
          status: ClaimStatus.VERIFIED,
          errors: [],
          timestamp: new Date(),
        };
      }
    } catch (err) {
      claim.errors.push(`${match.provider.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    // Stop on unambiguous match
    if (!match.isAmbiguous) break;
  }

  claim.status = ClaimStatus.FAILED;
  return {
    status: ClaimStatus.FAILED,
    errors: claim.errors,
    timestamp: new Date(),
  };
}

async function fetchProof(request: ProofRequest, opts: VerifyOptions): Promise<unknown> {
  const fetcher = fetchers.get(request.fetcher);
  if (!fetcher) {
    throw new Error(`Unknown fetcher: ${request.fetcher}`);
  }
  console.log(`[runner] Fetching proof: ${request.fetcher} ${request.uri} (format: ${request.format})`);
  const data = await fetcher.fetch(request.uri, {
    format: request.format,
    timeout: opts.timeout ?? DEFAULT_TIMEOUT,
    headers: request.options?.headers,
  });
  const fileKeys = data && typeof data === "object" && "files" in data ? Object.keys((data as Record<string, unknown>).files as object) : [];
  console.log(`[runner] Fetched proof, files: ${JSON.stringify(fileKeys)}`);
  return data;
}

function checkProof(data: unknown, targets: ProofTarget[], did: string): boolean {
  const proofPatterns = generateProofPatterns(did);
  console.log(`[runner] Checking proof for DID ${did}, patterns: ${JSON.stringify(proofPatterns)}`);
  console.log(`[runner] Proof targets: ${JSON.stringify(targets.map((t) => t.path.join(".")))}`);

  for (const target of targets) {
    const values = extractValues(data, target.path);
    console.log(`[runner] Target ${target.path.join(".")}: found ${values.length} value(s)${values.length > 0 ? `: ${JSON.stringify(values.map((v) => v.slice(0, 100)))}` : ""}`);
    for (const value of values) {
      if (matchesPattern(value, proofPatterns, target.relation)) {
        console.log(`[runner] Match found at ${target.path.join(".")} (relation: ${target.relation})`);
        return true;
      }
    }
  }
  console.log(`[runner] No match found in any target`);
  return false;
}

function generateProofPatterns(did: string): string[] {
  const patterns = [did];

  if (did.startsWith("did:plc:")) {
    patterns.push(did.replace("did:plc:", ""));
  }

  return patterns;
}

function extractValues(data: unknown, path: string[]): string[] {
  const results: string[] = [];
  extractValuesRecursive(data, path, 0, results);
  return results;
}

function extractValuesRecursive(data: unknown, path: string[], index: number, results: string[]): void {
  if (data === null || data === undefined) return;

  if (index >= path.length) {
    if (typeof data === "string") {
      results.push(data);
    } else if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === "string") {
          results.push(item);
        }
      }
    }
    return;
  }

  const key = path[index];

  if (key === "*" && Array.isArray(data)) {
    for (const item of data) {
      extractValuesRecursive(item, path, index + 1, results);
    }
  } else if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    extractValuesRecursive(record[key], path, index + 1, results);
  }
}

function matchesPattern(value: string, patterns: string[], relation: "contains" | "equals" | "startsWith"): boolean {
  for (const pattern of patterns) {
    switch (relation) {
      case "contains":
        if (value.includes(pattern)) return true;
        break;
      case "equals":
        if (value === pattern) return true;
        break;
      case "startsWith":
        if (value.startsWith(pattern)) return true;
        break;
    }
  }
  return false;
}
