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
  path?: string[];
  /** How to match: 'contains', 'equals', 'startsWith' */
  relation: "contains" | "equals" | "startsWith";
  /** Format of data at path */
  format: "text" | "uri" | "json";
  /** Optional CSS selector for HTML extraction (when fetcher format is 'html') */
  css?: string;
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
  format: "json" | "text" | "json-ld" | "og-meta" | "html";
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
 * Context handed to a provider's `verifyAccess` hook
 */
export interface AccessContext {
  /** The DID being claimed */
  did: string;
  /** The regex match against the claim URI */
  match: RegExpMatchArray;
  /** Identity metadata already derived by `postprocess` */
  identity: {
    subject?: string;
    avatarUrl?: string;
    profileUrl?: string;
    displayName?: string;
    account?: string;
  };
  /** Fetch further data through the runner's fetcher registry */
  fetch(request: ProofRequest): Promise<unknown>;
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
  /** How to render the icon: "badge" (in circle bg, default) or "raw" (standalone SVG) */
  iconDisplay?: "badge" | "raw";
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

  /**
   * Optional post-processing after fetch to extract identity metadata.
   *
   * `did` is the DID being claimed. Providers that need to know *which part* of the proof
   * carried the DID (e.g. which npm version, and therefore who published it) use it to bind
   * the identity to the DID rather than to the proof document as a whole. Throw to refuse
   * to attest when a trustworthy identity can't be derived.
   */
  postprocess?(
    data: unknown,
    match: RegExpMatchArray,
    did?: string,
  ): {
    subject?: string;
    avatarUrl?: string;
    profileUrl?: string;
    displayName?: string;
    account?: string;
  };

  /**
   * Optional check, run after the DID proof matches and `postprocess` succeeds, asserting a
   * condition that the proof document itself can't establish — typically that access is
   * *still* held rather than merely held once.
   *
   * A published artifact outlives the permission that created it: an npm package stays in an
   * org scope after its publisher leaves. Providers whose proof has that shape re-check the
   * live permission here.
   *
   * Return `null` when satisfied, or a human-readable reason when not. `fetch` routes through
   * the runner's fetcher registry so it honours the caller's timeout and proxy settings.
   */
  verifyAccess?(ctx: AccessContext): Promise<string | null>;

  /** Generate proof text for user to add to their profile */
  getProofText(did: string, handle?: string): string;

  /** Human-readable instructions for where to place the proof */
  getProofLocation?(match: RegExpMatchArray): string;

  /** Return hints explaining why proof verification failed (called only on failure) */
  getRecommendations?(data: unknown, match: RegExpMatchArray): string[];

  /** Test cases for validation */
  tests: {
    uri: string;
    shouldMatch: boolean;
  }[];
}
