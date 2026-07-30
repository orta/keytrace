import type { AccessContext, ServiceProvider } from "./types.js";
import { KEYTRACE_PACKAGE, assertScopeKind, packumentPublisherOf, scopeKindRequest, type Packument } from "./npmRegistry.js";

/**
 * npm service provider
 *
 * Users prove ownership of an npm account by publishing a package in their personal scope,
 * @username/keytrace-claim, containing their DID in the package.json did field. Creating a
 * package in a personal scope requires being that user.
 *
 * Legacy: unscoped packages named keytrace-[handle] are also supported.
 *
 * For organization scopes see the `npmorg` provider — this one deliberately rejects them, since
 * "@babel published this" says nothing about which person is claiming it.
 */
const npm: ServiceProvider = {
  id: "npm",
  name: "npm",
  homepage: "https://www.npmjs.com",

  // Match scoped: https://www.npmjs.com/package/@username/keytrace or @username/keytrace-claim
  // Match legacy: https://www.npmjs.com/package/keytrace-username
  reUri: /^https:\/\/(?:www\.)?npmjs\.com\/package\/(?:@([a-z0-9_-]+)\/(keytrace(?:-claim)?)|(keytrace-[a-z0-9_-]+))\/?$/i,

  // @acme/keytrace-claim is a valid personal claim and a valid org claim, and nothing in the URL
  // says which — only the registry knows whether a scope is a person or an org. Being ambiguous
  // means a scoped URL that fails here falls through to `npmorg` rather than dead-ending.
  isAmbiguous: true,

  ui: {
    description: "Link via an npm package",
    icon: "npm",
    iconDisplay: "raw",
    inputLabel: "npm Package URL or paste the string like '+ @your-npm-username/keytrace-claim@0.0.1'",
    inputPlaceholder: "https://www.npmjs.com/package/@yournpmuser/keytrace-claim",
    inputDefaultTemplate: undefined,
    instructions: [
      "Create a new folder with a `package.json` containing the verification content below",
      "Run `npm publish --access public` to publish",
      "Paste the npm package URL below",
    ],
    proofTemplate: `{
  "name": "@{your-npm-username}/${KEYTRACE_PACKAGE}",
  "version": "0.0.1",
  "did": "{did}",
  "publishConfig": {
    "access": "public"
  }
}`,
  },

  processURI(uri, match) {
    const [, scopedUsername, , legacyPackage] = match;

    if (scopedUsername) {
      // Scoped package: @username/keytrace or @username/keytrace-claim
      // Extract the package subname from the URI to use the exact name they provided
      const packageSubname = uri.includes(`/${KEYTRACE_PACKAGE}`) ? KEYTRACE_PACKAGE : "keytrace";
      return {
        profile: {
          display: `~${scopedUsername}`,
          uri: `https://www.npmjs.com/~${scopedUsername}`,
        },
        proof: {
          request: {
            uri: `https://registry.npmjs.org/@${scopedUsername}/${packageSubname}`,
            fetcher: "http",
            format: "json",
          },
          target: [{ path: ["versions", "*", "did"], relation: "contains", format: "text" }],
        },
      };
    } else {
      // Legacy unscoped package: keytrace-handle
      const handle = legacyPackage.replace(/^keytrace-/i, "");
      return {
        profile: {
          display: `~${handle}`,
          uri: `https://www.npmjs.com/~${handle}`,
        },
        proof: {
          request: {
            uri: `https://registry.npmjs.org/${legacyPackage}`,
            fetcher: "http",
            format: "json",
          },
          target: [{ path: ["versions", "*", "did"], relation: "contains", format: "text" }],
        },
      };
    }
  },

  postprocess(data, match, did) {
    const [, scopedUsername, , legacyPackage] = match;
    const packument = data as Packument;

    if (scopedUsername) {
      // The scope *is* the username, so it names the account directly. Reading it from the URI
      // rather than from maintainers[0] matters: maintainers is an unordered set of everyone
      // with write access, so its first entry is not reliably the account being claimed.
      const username = scopedUsername.toLowerCase();

      // Publishing into a personal scope requires being its owner, but a package can also have
      // collaborators added after the fact — so confirm the DID-bearing version came from the
      // owner rather than from someone they later granted access to.
      const publisher = packumentPublisherOf(packument, did);
      if (publisher.toLowerCase() !== username) {
        throw new Error(`The version carrying this DID was published by ${publisher}, not by @${username} — an npm claim must be published by the account it names`);
      }

      return {
        subject: username,
        profileUrl: `https://www.npmjs.com/~${username}`,
      };
    }

    // Legacy unscoped keytrace-<handle>: the package name is self-asserted, so the only binding
    // available is that the named handle currently maintains it.
    const handle = legacyPackage.replace(/^keytrace-/i, "").toLowerCase();
    const maintainers = (packument.maintainers ?? []).map((m) => m.name?.toLowerCase());
    if (!maintainers.includes(handle)) {
      throw new Error(`npm user ${handle} does not maintain ${legacyPackage} (maintainers: ${maintainers.join(", ") || "none"})`);
    }

    return {
      subject: handle,
      profileUrl: `https://www.npmjs.com/~${handle}`,
    };
  },

  async verifyAccess(ctx: AccessContext): Promise<string | null> {
    const scopedUsername = ctx.match[1];
    // The legacy unscoped form has no scope to classify; postprocess's maintainer check is all
    // the binding it gets.
    if (!scopedUsername) return null;

    const scope = scopedUsername.toLowerCase();

    // Fails open, unlike npmorg's equivalent check, because org scopes are already excluded
    // offline: postprocess requires the DID-bearing version's publisher to equal the scope name,
    // and npm usernames and org names share one namespace, so no user can be named after an
    // existing org. This call only upgrades that rejection to an error message that points at
    // the right claim type, so a registry hiccup should not fail every npm re-verification.
    let kind;
    try {
      kind = await assertScopeKind(scope, () => ctx.fetch(scopeKindRequest(scope)));
    } catch {
      return null;
    }

    if (kind === "org") {
      return `@${scope} is an npm organization, not a personal account — claim it with the npm organization claim type instead`;
    }

    return null;
  },

  getProofText(did, _handle) {
    return `{
  "name": "@[your-npm-username]/${KEYTRACE_PACKAGE}",
  "version": "0.0.1",
  "did": "${did}",
  "publishConfig": { "access": "public" }
}`;
  },

  getProofLocation() {
    return `Publish a scoped npm package named @[your-npm-username]/${KEYTRACE_PACKAGE} with your DID in the did field of package.json`;
  },

  tests: [
    // Scoped (new)
    { uri: "https://www.npmjs.com/package/@alice/keytrace-claim", shouldMatch: true },
    { uri: "https://npmjs.com/package/@alice/keytrace-claim", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/@alice/keytrace-claim/", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/@alice/keytrace", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/@alice/other-pkg", shouldMatch: false },
    // Legacy (unscoped)
    { uri: "https://www.npmjs.com/package/keytrace-alice", shouldMatch: true },
    { uri: "https://npmjs.com/package/keytrace-alice", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/some-other-pkg", shouldMatch: false },
    { uri: "https://www.npmjs.com/~alice", shouldMatch: false },
    // Org pages belong to the npmorg provider
    { uri: "https://www.npmjs.com/org/babel", shouldMatch: false },
  ],
};

export default npm;
