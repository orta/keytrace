import type { VerificationResult, VerifyOptions } from "./types.js";
export type { ClaimIdentity, ClaimRecord, ClaimSignature, ClaimVerificationResult, ES256PublicJwk, KeyRecord, SignedClaimData, VerificationResult, VerificationStep, VerifyOptions, } from "./types.js";
/**
 * Verify all keytrace claims for a handle.
 *
 * @param handle The ATProto handle (e.g., "alice.bsky.social") or DID
 * @param options Optional configuration
 * @returns Verification results for all claims
 */
export declare function verifyClaims(handle: string, options?: VerifyOptions): Promise<VerificationResult>;
/**
 * Verify all keytrace claims for a DID.
 *
 * @param did The ATProto DID (e.g., "did:plc:abc123")
 * @param options Optional configuration
 * @returns Verification results for all claims
 */
export declare function verifyClaimsOnDid(did: string, options?: VerifyOptions): Promise<VerificationResult>;
//# sourceMappingURL=verify.d.ts.map