import github from "./github.js";
import dns from "./dns.js";
import activitypub from "./activitypub.js";
import bsky from "./bsky.js";
import npm from "./npm.js";
import tangled from "./tangled.js";
import pgp from "./pgp.js";
import type { ServiceProvider, ServiceProviderMatch } from "./types.js";

export type { ServiceProvider, ServiceProviderMatch, ServiceProviderUI, ExtraInput, ProofTarget, ProofRequest, ProcessedURI } from "./types.js";

const providers: Record<string, ServiceProvider> = {
  github,
  dns,
  activitypub,
  bsky,
  npm,
  tangled,
  pgp,
};

/**
 * Get a service provider by ID
 */
export function getProvider(id: string): ServiceProvider | undefined {
  return providers[id];
}

/**
 * Get all registered service providers
 */
export function getAllProviders(): ServiceProvider[] {
  return Object.values(providers);
}

/**
 * Match a URI against all service providers
 * Returns all matching providers, with unambiguous matches stopping the search
 */
export function matchUri(uri: string): ServiceProviderMatch[] {
  const matches: ServiceProviderMatch[] = [];

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
export function getProofTextForProvider(providerId: string, did: string, handle?: string): string | undefined {
  const provider = providers[providerId];
  return provider?.getProofText(did, handle);
}

export { github, dns, activitypub, bsky, npm, tangled, pgp };
