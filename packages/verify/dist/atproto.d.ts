import type { ClaimRecord, VerifyOptions } from "./types.js";
/**
 * Resolve a handle to a DID using the public ATProto API.
 */
export declare function resolveHandle(handle: string, options?: VerifyOptions): Promise<string>;
/**
 * Resolve the PDS endpoint from a DID document.
 */
export declare function resolvePds(did: string, options?: VerifyOptions): Promise<string>;
/**
 * List all keytrace claim records from a user's repo.
 */
export declare function listClaimRecords(pdsUrl: string, did: string, options?: VerifyOptions): Promise<Array<{
    uri: string;
    rkey: string;
    value: ClaimRecord;
}>>;
/**
 * Fetch a single record by AT URI.
 */
export declare function getRecordByUri<T>(atUri: string, options?: VerifyOptions): Promise<T>;
//# sourceMappingURL=atproto.d.ts.map