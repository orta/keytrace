import { ClaimStatus } from "./types.js";
import { type ServiceProviderMatch } from "./serviceProviders/index.js";
import type { VerifyOptions, ClaimVerificationResult } from "./types.js";
/**
 * Validate a DID string. Accepts did:plc and did:web formats.
 */
export declare function isValidDid(did: string): boolean;
/**
 * Represents a single identity claim linking a DID to an external account
 */
export declare class Claim {
    private _uri;
    private _did;
    private _status;
    private _matches;
    private _errors;
    constructor(uri: string, did: string);
    get uri(): string;
    get did(): string;
    get status(): ClaimStatus;
    get matches(): ServiceProviderMatch[];
    get errors(): string[];
    /**
     * Match the claim URI against known service providers
     */
    match(): void;
    /**
     * Check if the claim is ambiguous (matches multiple providers)
     */
    isAmbiguous(): boolean;
    /**
     * Get the matched service provider (first unambiguous match, or first match)
     */
    getMatchedProvider(): ServiceProviderMatch | undefined;
    /**
     * Verify the claim by fetching proof and checking for DID
     */
    verify(opts?: VerifyOptions): Promise<ClaimVerificationResult>;
    private fetchProof;
    private checkProof;
    private generateProofPatterns;
    private extractValues;
    private extractValuesRecursive;
    private matchesPattern;
    toJSON(): object;
    static fromJSON(data: {
        uri: string;
        did: string;
    }): Claim;
}
//# sourceMappingURL=claim.d.ts.map