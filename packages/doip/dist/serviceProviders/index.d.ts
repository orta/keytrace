import github from "./github.js";
import dns from "./dns.js";
import activitypub from "./activitypub.js";
import bsky from "./bsky.js";
import type { ServiceProvider, ServiceProviderMatch } from "./types.js";
export type { ServiceProvider, ServiceProviderMatch, ProofTarget, ProofRequest, ProcessedURI, } from "./types.js";
/**
 * Get a service provider by ID
 */
export declare function getProvider(id: string): ServiceProvider | undefined;
/**
 * Get all registered service providers
 */
export declare function getAllProviders(): ServiceProvider[];
/**
 * Match a URI against all service providers
 * Returns all matching providers, with unambiguous matches stopping the search
 */
export declare function matchUri(uri: string): ServiceProviderMatch[];
/**
 * Get the proof text a user should add to verify a claim
 */
export declare function getProofTextForProvider(providerId: string, did: string, handle?: string): string | undefined;
export { github, dns, activitypub, bsky };
//# sourceMappingURL=index.d.ts.map