/**
 * Result of verifying a claim
 */
export interface ClaimVerificationResult {
  status: ClaimStatus;
  errors: string[];
  timestamp: Date;
}

/**
 * Profile data from ATProto
 */
export interface ProfileData {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  claims: ClaimData[];
}

/**
 * Individual claim data from ATProto record
 */
export interface ClaimData {
  uri: string;
  did: string;
  comment?: string;
  createdAt: string;
  rkey: string;
}

/**
 * Options for verification operations
 */
export interface VerifyOptions {
  /** Timeout for fetcher operations in ms */
  timeout?: number;
  /** Skip cache and force fresh verification */
  skipCache?: boolean;
  /** Proxy URL for browser-based DNS/HTTP requests */
  proxyUrl?: string;
}

/**
 * Claim status enum
 */
export enum ClaimStatus {
  INIT = "init",
  MATCHED = "matched",
  VERIFIED = "verified",
  FAILED = "failed",
  ERROR = "error",
}

/** Injected fetch function - allows caller to provide proxy, auth, etc. */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

/** Configuration for the recipe runner */
export interface RunnerConfig {
  /** Custom fetch function (defaults to global fetch) */
  fetch?: FetchFn;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
}

/** Context for a claim verification attempt */
export interface ClaimContext {
  /** Unique claim ID for this verification attempt */
  claimId: string;
  /** User's ATProto DID */
  did: string;
  /** User's ATProto handle */
  handle: string;
  /** User-provided params from recipe (e.g., { gistUrl: "..." }) */
  params: Record<string, string>;
}

/** Result of running a full recipe verification */
export interface VerificationResult {
  success: boolean;
  steps: StepResult[];
  /** Extracted subject from params (e.g., "github:octocat") */
  subject?: string;
  error?: string;
}

/** Result of a single verification step */
export interface StepResult {
  action: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

/** A recipe parameter definition */
export interface RecipeParam {
  key: string;
  label: string;
  type: "url" | "text" | "domain";
  placeholder?: string;
  pattern?: string;
  extractFrom?: string;
}

/** User-facing instructions for how to set up a claim */
export interface RecipeInstructions {
  steps: string[];
  proofTemplate?: string;
  proofLocation?: string;
}

/** A single verification step in a recipe */
export interface VerificationStep {
  action: "http-get" | "json-path" | "css-select" | "regex-match" | "dns-txt";
  url?: string;
  selector?: string;
  pattern?: string;
  expect?: string;
}

/** Machine-readable verification definition */
export interface RecipeVerification {
  steps: VerificationStep[];
}

/** A claim verification recipe */
export interface Recipe {
  $type?: string;
  type: string;
  version: number;
  displayName: string;
  params?: RecipeParam[];
  instructions: RecipeInstructions;
  verification: RecipeVerification;
}
