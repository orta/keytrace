/**
 * A match between a URI and a service provider
 */
export interface ServiceProviderMatch {
  provider: ServiceProvider;
  match: RegExpMatchArray;
  isAmbiguous: boolean;
}

/**
 * Where to look for proof in the fetched response
 */
export interface ProofTarget {
  /** JSON path to search for proof (e.g., ['description'], ['files', '*', 'content']) */
  path: string[];
  /** How to match: 'contains', 'equals', 'startsWith' */
  relation: "contains" | "equals" | "startsWith";
  /** Format of data at path */
  format: "text" | "uri" | "json";
}

/**
 * How to fetch the proof
 */
export interface ProofRequest {
  /** URL template with {placeholders} */
  uri: string;
  /** Fetcher to use: 'http', 'dns', 'activitypub' */
  fetcher: string;
  /** Expected response format */
  format: "json" | "text";
  /** Additional fetch options */
  options?: {
    headers?: Record<string, string>;
  };
}

/**
 * Result of processing a URI
 */
export interface ProcessedURI {
  /** Profile display info */
  profile: {
    display: string;
    uri: string;
    qrcode?: boolean;
  };
  /** How to fetch and verify the proof */
  proof: {
    request: ProofRequest;
    target: ProofTarget[];
  };
}

/**
 * A service provider that can verify identity claims
 */
export interface ServiceProvider {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Homepage URL */
  homepage: string;

  /** Regex to match claim URIs */
  reUri: RegExp;

  /** Whether matches are potentially ambiguous (could match multiple providers) */
  isAmbiguous?: boolean;

  /** Process matched URI into verification config */
  processURI(uri: string, match: RegExpMatchArray): ProcessedURI;

  /** Optional post-processing after fetch */
  postprocess?(
    data: unknown,
    match: RegExpMatchArray,
  ): {
    display?: string;
    uri?: string;
  };

  /** Generate proof text for user to add to their profile */
  getProofText(did: string, handle?: string): string;

  /** Test cases for validation */
  tests: {
    uri: string;
    shouldMatch: boolean;
  }[];
}
