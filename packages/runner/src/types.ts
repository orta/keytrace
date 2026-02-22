/**
 * Identity metadata extracted during verification
 */
export interface IdentityMetadata {
  /** Display name / username */
  subject?: string;
  /** Avatar/profile image URL */
  avatarUrl?: string;
  /** Profile page URL */
  profileUrl?: string;
  /** Display name if different from subject */
  displayName?: string;
}

/**
 * Details about a single proof target check
 */
export interface ProofTargetResult {
  path: string[];
  relation: string;
  valuesFound: string[];
  matched: boolean;
}

/**
 * Details about the proof fetching and matching process
 */
export interface ProofDetails {
  /** The URL that was fetched */
  fetchUrl: string;
  /** The fetcher used (http, dns, etc.) */
  fetcher: string;
  /** Raw content that was fetched (truncated if large) */
  content: string;
  /** The proof targets that were checked */
  targets: ProofTargetResult[];
  /** The patterns used for matching (DID variations) */
  patterns: string[];
}

/**
 * Result of verifying a claim
 */
export interface ClaimVerificationResult {
  status: ClaimStatus;
  errors: string[];
  timestamp: Date;
  /** Identity metadata extracted from the proof source */
  identity?: IdentityMetadata;
  /** Details about the proof fetching and verification process */
  proofDetails?: ProofDetails;
}

/**
 * Profile data from ATProto
 */
export interface ProfileData {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  claims: ClaimData[];
}

/**
 * Individual claim data from ATProto record
 */
export interface ClaimData {
  uri: string;
  did: string;
  type?: string;
  comment?: string;
  createdAt: string;
  rkey: string;
  identity?: IdentityMetadata;
  /** Signing key reference from the claim record */
  sig?: { src?: string };
  /** Current verification status. Absent on legacy records, treated as "verified". */
  status?: "verified" | "failed" | "retracted";
  /** Timestamp of the most recent successful re-verification */
  lastVerifiedAt?: string;
  /** Timestamp when the claim last failed re-verification or was retracted */
  failedAt?: string;
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
  /** Trusted signer handles whose signing keys are accepted (default: ["keytrace.dev"]) */
  trustedSigners?: string[];
}

/**
 * Options for profile fetching
 */
export interface ProfileOptions {
  /** ATProto service URL override */
  serviceUrl?: string;
  /** Trusted signer handles whose signing keys are accepted (default: ["keytrace.dev"]) */
  trustedSigners?: string[];
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
