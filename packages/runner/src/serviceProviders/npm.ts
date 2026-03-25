import type { ServiceProvider } from "./types.js";

/**
 * npm service provider
 *
 * Users prove ownership by publishing a scoped npm package named @username/keytrace-claim
 * containing their DID in the package.json did field.
 *
 * Legacy: unscoped packages named keytrace-[handle] are also supported.
 */
const npm: ServiceProvider = {
  id: "npm",
  name: "npm",
  homepage: "https://www.npmjs.com",

  // Match scoped: https://www.npmjs.com/package/@username/keytrace or @username/keytrace-claim
  // Match legacy: https://www.npmjs.com/package/keytrace-username
  reUri: /^https:\/\/(?:www\.)?npmjs\.com\/package\/(?:@([a-z0-9_-]+)\/(keytrace(?:-claim)?)|(keytrace-[a-z0-9_-]+))\/?$/i,

  isAmbiguous: false,

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
  "name": "{your-npm-username}/keytrace-claim",
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
      const packageSubname = uri.includes("/keytrace-claim") ? "keytrace-claim" : "keytrace";
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

  postprocess(data, _match) {
    const packument = data as {
      maintainers?: Array<{ name: string; email?: string }>;
      author?: { name?: string; email?: string } | string;
    };

    // Get the first maintainer's npm username
    const maintainer = packument.maintainers?.[0];
    const npmUsername = maintainer?.name;

    return {
      subject: npmUsername,
      profileUrl: npmUsername ? `https://www.npmjs.com/~${npmUsername}` : undefined,
    };
  },

  getProofText(did, _handle) {
    return `{
  "name": "@[your-npm-username]/keytrace-claim",
  "version": "0.0.1",
  "did": "${did}",
  "publishConfig": { "access": "public" }
}`;
  },

  getProofLocation() {
    return `Publish a scoped npm package named @[your-npm-username]/keytrace-claim with your DID in the did field of package.json`;
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
  ],
};

export default npm;
