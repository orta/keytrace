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
    /** Display name for the identity (e.g., username, domain) */
    display: string;
    /** URL to the identity's profile page */
    uri: string;
  };
  /** How to fetch and verify the proof */
  proof: {
    request: ProofRequest;
    target: ProofTarget[];
  };
}

/**
 * An additional input field for the add claim wizard (beyond the main claim URI)
 */
export interface ExtraInput {
  /** Unique key used as placeholder in templates, e.g. "fingerprint" → {fingerprint} */
  key: string;
  /** Label displayed above the input */
  label: string;
  /** Placeholder text */
  placeholder: string;
  /** Optional regex pattern for validation */
  pattern?: string;
  /** Validation error message shown when pattern doesn't match */
  patternError?: string;
}

/**
 * UI configuration for the add claim wizard
 */
export interface ServiceProviderUI {
  /** Short description for service picker (e.g., "Link via a public gist") */
  description: string;
  /** Lucide icon name (e.g., "github", "globe") */
  icon: string;
  /** Label for the claim URI input field */
  inputLabel: string;
  /** Placeholder text for the claim URI input */
  inputPlaceholder: string;
  /** Default value template for input. Supports {did}, {handle}, {slugHandle} placeholders */
  inputDefaultTemplate?: string;
  /** Step-by-step instructions (markdown supported) */
  instructions: string[];
  /** Template for proof content. Supports {did} and {handle} placeholders */
  proofTemplate: string;
  /** Additional input fields beyond the main claim URI */
  extraInputs?: ExtraInput[];
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

  /** UI configuration for the add claim wizard */
  ui: ServiceProviderUI;

  /** Process matched URI into verification config */
  processURI(uri: string, match: RegExpMatchArray): ProcessedURI;

  /** Optional post-processing after fetch to extract identity metadata */
  postprocess?(
    data: unknown,
    match: RegExpMatchArray,
  ): {
    subject?: string;
    avatarUrl?: string;
    profileUrl?: string;
    displayName?: string;
  };

  /** Generate proof text for user to add to their profile */
  getProofText(did: string, handle?: string): string;

  /** Human-readable instructions for where to place the proof */
  getProofLocation?(match: RegExpMatchArray): string;

  /** Test cases for validation */
  tests: {
    uri: string;
    shouldMatch: boolean;
  }[];
}
