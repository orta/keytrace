import type { ES256PublicJwk, SignedClaimData } from "../types.js";
/**
 * Verify a JWS ES256 signature using Web Crypto API.
 *
 * @param claimData The claim data that was signed
 * @param jws The JWS compact serialization (header.payload.signature)
 * @param publicJwk The P-256 public key as JWK
 * @returns true if signature is valid, false otherwise
 */
export declare function verifyES256Signature(claimData: SignedClaimData, jws: string, publicJwk: ES256PublicJwk): Promise<boolean>;
//# sourceMappingURL=signature.d.ts.map