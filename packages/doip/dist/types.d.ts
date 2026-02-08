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
export declare enum ClaimStatus {
    INIT = "init",
    MATCHED = "matched",
    VERIFIED = "verified",
    FAILED = "failed",
    ERROR = "error"
}
//# sourceMappingURL=types.d.ts.map