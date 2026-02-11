/**
 * Identity metadata from a claim record
 */
export interface ClaimIdentity {
  subject: string;
  avatarUrl?: string;
  profileUrl?: string;
  displayName?: string;
}

/**
 * Signature data from a claim record
 */
export interface ClaimSignature {
  /** Key identifier (YYYY-MM-DD) */
  kid: string;
  /** AT URI to the signing key record */
  src: string;
  /** Timestamp when signed */
  signedAt: string;
  /** JWS compact serialization */
  attestation: string;
}

/**
 * Raw claim record from ATProto
 */
export interface ClaimRecord {
  $type: "dev.keytrace.claim";
  type: string;
  claimUri: string;
  identity: ClaimIdentity;
  sig: ClaimSignature;
  comment?: string;
  createdAt: string;
  prerelease?: boolean;
}

/**
 * Public key record from keytrace service
 */
export interface KeyRecord {
  $type: "dev.keytrace.key";
  publicJwk: string;
  validFrom: string;
  validUntil: string;
}

/**
 * Parsed JWK for P-256 public key
 */
export interface ES256PublicJwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
}

/**
 * Claim data that is signed (canonical form)
 */
export interface SignedClaimData {
  did: string;
  subject: string;
  type: string;
  verifiedAt: string;
}

/**
 * Verification step detail for debugging/auditing
 */
export interface VerificationStep {
  step: string;
  success: boolean;
  detail?: string;
  error?: string;
}

/**
 * Result of verifying a single claim
 */
export interface ClaimVerificationResult {
  /** AT URI of the claim record */
  uri: string;
  /** Record key */
  rkey: string;
  /** Claim type (github, dns, etc.) */
  type: string;
  /** The claim URI being verified */
  claimUri: string;
  /** Whether signature verification passed */
  verified: boolean;
  /** Verification steps performed */
  steps: VerificationStep[];
  /** Error message if verification failed */
  error?: string;
  /** Identity data (available regardless of verification status) */
  identity: ClaimIdentity;
  /** Full claim record */
  claim: ClaimRecord;
}

/**
 * Result of verifying all claims for a DID
 */
export interface VerificationResult {
  /** The DID that was verified */
  did: string;
  /** Resolved handle (if available) */
  handle?: string;
  /** Array of claim verification results */
  claims: ClaimVerificationResult[];
  /** Summary statistics */
  summary: {
    total: number;
    verified: number;
    failed: number;
  };
}

/**
 * Options for verification
 */
export interface VerifyOptions {
  /** Custom fetch function (defaults to globalThis.fetch) */
  fetch?: typeof fetch;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** PLC directory URL (default: https://plc.directory) */
  plcDirectoryUrl?: string;
  /** Public ATProto API URL for handle resolution (default: https://public.api.bsky.app) */
  publicApiUrl?: string;
}
