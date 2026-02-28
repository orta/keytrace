import { ClaimStatus } from "./types.js";
import { DEFAULT_TIMEOUT } from "./constants.js";
import { matchUri, type ServiceProviderMatch, type ProofRequest, type ProofTarget } from "./serviceProviders/index.js";
import * as fetchers from "./fetchers/index.js";
import type { VerifyOptions, ClaimVerificationResult, IdentityMetadata, ProofDetails, ProofTargetResult } from "./types.js";
import * as cheerio from "cheerio";

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

  // Track proof details for the response
  let proofDetails: ProofDetails | undefined;

  // Try each matched provider until one succeeds
  for (const match of claim.matches) {
    try {
      const config = match.provider.processURI(claim.uri, match.match);
      const proofData = await fetchProof(config.proof.request, opts);

      // Build proof details
      const patterns = generateProofPatterns(claim.did);
      const targetResults = checkProofWithDetails(proofData, config.proof.target, patterns);

      proofDetails = {
        fetchUrl: config.proof.request.uri,
        fetcher: config.proof.request.fetcher,
        content: truncateContent(proofData),
        targets: targetResults,
        patterns,
      };

      const verified = targetResults.some((t) => t.matched);

      if (verified) {
        claim.status = ClaimStatus.VERIFIED;

        // Extract identity metadata via postprocess if available
        let identity: IdentityMetadata | undefined;
        if (match.provider.postprocess) {
          const metadata = match.provider.postprocess(proofData, match.match);
          identity = {
            subject: metadata.subject,
            avatarUrl: metadata.avatarUrl,
            profileUrl: metadata.profileUrl,
            displayName: metadata.displayName,
          };
        }

        return {
          status: ClaimStatus.VERIFIED,
          errors: [],
          timestamp: new Date(),
          identity,
          proofDetails,
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
    proofDetails,
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

function checkProofWithDetails(data: unknown, targets: ProofTarget[], patterns: string[]): ProofTargetResult[] {
  console.log(`[runner] Checking proof, patterns: ${JSON.stringify(patterns)}`);
  console.log(`[runner] Proof targets: ${JSON.stringify(targets.map((t) => t.css || t.path?.join(".") || ""))}`);

  const results: ProofTargetResult[] = [];

  for (const target of targets) {
    const values = extractValues(data, target);
    const targetDesc = target.css || target.path?.join(".") || "";
    console.log(`[runner] Target ${targetDesc}: found ${values.length} value(s)${values.length > 0 ? `: ${JSON.stringify(values.map((v) => v.slice(0, 100)))}` : ""}`);

    let matched = false;
    for (const value of values) {
      if (matchesPattern(value, patterns, target.relation)) {
        console.log(`[runner] Match found at ${targetDesc} (relation: ${target.relation})`);
        matched = true;
        break;
      }
    }

    results.push({
      path: target.path || [],
      relation: target.relation,
      valuesFound: values.map((v) => v.slice(0, 500)), // Truncate long values
      matched,
      css: target.css,
    });
  }

  if (!results.some((r) => r.matched)) {
    console.log(`[runner] No match found in any target`);
  }

  return results;
}

function truncateContent(data: unknown): string {
  const MAX_LENGTH = 2000;
  let content: string;

  if (data === null || data === undefined) {
    return "(no content returned)";
  }

  if (typeof data === "string") {
    content = data;
  } else {
    try {
      content = JSON.stringify(data, null, 2);
    } catch {
      content = String(data);
    }
  }

  if (content.length > MAX_LENGTH) {
    return content.slice(0, MAX_LENGTH) + "\n... (truncated)";
  }
  return content;
}

function generateProofPatterns(did: string): string[] {
  const patterns = [did];

  if (did.startsWith("did:plc:")) {
    patterns.push(did.replace("did:plc:", ""));
  }

  return patterns;
}

function extractValues(data: unknown, target: ProofTarget): string[] {
  // If target has a CSS selector, use cheerio to extract from HTML
  if (target.css && typeof data === "string") {
    try {
      const $ = cheerio.load(data);
      const results: string[] = [];
      $(target.css).each((_, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          results.push(text);
        }
      });
      return results;
    } catch (err) {
      console.error(`[runner] CSS selector extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return [];
    }
  }

  // Otherwise use JSON path extraction
  const results: string[] = [];
  extractValuesRecursive(data, target.path || [], 0, results);
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

  if (key === "*") {
    if (Array.isArray(data)) {
      // Wildcard for arrays: iterate all items
      for (const item of data) {
        extractValuesRecursive(item, path, index + 1, results);
      }
    } else if (typeof data === "object" && data !== null) {
      // Wildcard for objects: iterate all values
      const record = data as Record<string, unknown>;
      for (const value of Object.values(record)) {
        extractValuesRecursive(value, path, index + 1, results);
      }
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
