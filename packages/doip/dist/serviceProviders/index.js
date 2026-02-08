import github from "./github.js";
import dns from "./dns.js";
import activitypub from "./activitypub.js";
import bsky from "./bsky.js";
const providers = {
    github,
    dns,
    activitypub,
    bsky,
};
/**
 * Get a service provider by ID
 */
export function getProvider(id) {
    return providers[id];
}
/**
 * Get all registered service providers
 */
export function getAllProviders() {
    return Object.values(providers);
}
/**
 * Match a URI against all service providers
 * Returns all matching providers, with unambiguous matches stopping the search
 */
export function matchUri(uri) {
    const matches = [];
    for (const provider of Object.values(providers)) {
        const match = uri.match(provider.reUri);
        if (match) {
            matches.push({
                provider,
                match,
                isAmbiguous: provider.isAmbiguous ?? false,
            });
            // Stop on unambiguous match
            if (!provider.isAmbiguous) {
                break;
            }
        }
    }
    return matches;
}
/**
 * Get the proof text a user should add to verify a claim
 */
export function getProofTextForProvider(providerId, did, handle) {
    const provider = providers[providerId];
    return provider?.getProofText(did, handle);
}
export { github, dns, activitypub, bsky };
//# sourceMappingURL=index.js.map