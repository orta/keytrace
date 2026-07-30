/**
 * Shared helpers for the npm registry, used by the `npm` and `npmorg` providers.
 *
 * Everything here goes through registry.npmjs.org — www.npmjs.com serves 403 to non-browser
 * clients, so the website is not a usable data source.
 */

import type { ProofRequest } from "./types.js";

/** The package users publish to prove a claim */
export const KEYTRACE_PACKAGE = "keytrace-claim";

/**
 * Org claim packages are suffixed with the publisher's npm username —
 * `@acme/keytrace-claim-alice`. A single shared `@acme/keytrace-claim` would force every member
 * of an org to publish over each other's package to make their own claim, and would leave the
 * package page showing whoever happened to publish last.
 */
export const KEYTRACE_ORG_PACKAGE_PREFIX = `${KEYTRACE_PACKAGE}-`;

/** A single published version within a packument */
export interface PackumentVersion {
  did?: string;
  /**
   * Who published this version. Publishes made through npm's trusted publishing carry an
   * automation identity (`{ name: "GitHub Actions", trustedPublisher: {...} }`) rather than a
   * person, so this cannot be assumed to name a human.
   */
  _npmUser?: { name?: string; email?: string; trustedPublisher?: { id?: string } };
}

/** The subset of an npm packument these providers read */
export interface Packument {
  maintainers?: Array<{ name: string; email?: string }>;
  versions?: Record<string, PackumentVersion>;
  time?: Record<string, string>;
  "dist-tags"?: Record<string, string>;
}

/**
 * Whether a scope belongs to a person or an organisation.
 *
 * `/-/org/<scope>/user` is readable without auth and distinguishes the two: a personal scope
 * reports its owner (`{"alice": "owner"}`), while an org returns `{}` because member lists are
 * private. A nonexistent scope 404s, which surfaces as a fetch error.
 */
export type ScopeKind = "user" | "org";

export function scopeKindRequest(scope: string): ProofRequest {
  return {
    uri: `https://registry.npmjs.org/-/org/${encodeURIComponent(scope)}/user`,
    fetcher: "http",
    format: "json",
  };
}

/**
 * The packages a scope or user currently has access to. Public, and live: revoking someone's
 * org access removes that org's packages from their list.
 */
export function scopeAccessRequest(scope: string): ProofRequest {
  return {
    uri: `https://registry.npmjs.org/-/org/${encodeURIComponent(scope)}/package`,
    fetcher: "http",
    format: "json",
  };
}

/**
 * Classify a scope, given a thunk that fetches `scopeKindRequest(scope)`.
 *
 * Treats an unreadable response as an org: the members-are-private case is the one that returns
 * an empty body, and misclassifying an org as a user would wrongly reject a valid claim. The
 * caller's own access check is what actually gates verification.
 */
export async function assertScopeKind(_scope: string, fetchKind: () => Promise<unknown>): Promise<ScopeKind> {
  const data = (await fetchKind()) as Record<string, string> | null;
  if (!data || typeof data !== "object") return "org";
  return Object.keys(data).length > 0 ? "user" : "org";
}

/** Whether an `_npmUser` names a person rather than a CI automation identity */
function isHumanPublisher(user: PackumentVersion["_npmUser"]): user is { name: string } {
  return !!user?.name && !user.trustedPublisher;
}

/**
 * Find the npm user who published a version whose `did` field carries `did`.
 *
 * Scanning for the DID rather than reading `dist-tags.latest` matters: anyone else with write
 * access to the scope can publish a newer version, and attributing the claim to the most recent
 * publisher would then bind the DID to the wrong person. When several versions carry the DID the
 * most recently published one wins.
 *
 * Throws rather than returning undefined — an unattributable proof must not produce a signed
 * attestation naming nobody.
 */
export function packumentPublisherOf(packument: Packument, did?: string): string {
  const versions = packument?.versions ?? {};
  const times = packument?.time ?? {};

  const candidates = Object.entries(versions)
    .filter(([, version]) => {
      const value = version?.did;
      if (typeof value !== "string") return false;
      // `contains` mirrors the runner's own DID matching, which tolerates surrounding text
      return did ? value.includes(did) : true;
    })
    .sort(([a], [b]) => (times[b] ?? "").localeCompare(times[a] ?? ""));

  if (candidates.length === 0) {
    throw new Error(`No published version has a "did" field matching ${did ?? "this account"}`);
  }

  const attributable = candidates.find(([, version]) => isHumanPublisher(version._npmUser));
  if (!attributable) {
    const [version] = candidates[0];
    throw new Error(
      `Version ${version} carries the DID but was published by an automation identity, so it cannot be attributed to an npm user — publish from an account with \`npm publish\` instead of trusted publishing`,
    );
  }

  return attributable[1]._npmUser!.name!;
}
