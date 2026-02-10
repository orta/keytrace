import type { ServiceProvider } from "./types.js";

/**
 * Slugify a handle for use in npm package names.
 * Replaces dots with dashes since npm doesn't allow dots.
 * e.g. "orta.io" -> "orta-io"
 */
function slugifyHandle(handle: string): string {
  return handle.replace(/\./g, "-").toLowerCase();
}

/**
 * npm service provider
 *
 * Users prove ownership by publishing an npm package named keytrace-[handle]
 * containing their DID in the package.json keytrace field.
 */
const npm: ServiceProvider = {
  id: "npm",
  name: "npm",
  homepage: "https://www.npmjs.com",

  // Match npm package URLs: https://www.npmjs.com/package/keytrace-username
  reUri: /^https:\/\/(?:www\.)?npmjs\.com\/package\/(keytrace-[a-z0-9_-]+)\/?$/i,

  isAmbiguous: false,

  ui: {
    description: "Link via an npm package",
    icon: "npm",
    inputLabel: "npm Package URL",
    inputPlaceholder: "https://www.npmjs.com/package/keytrace-yourhandle",
    inputDefaultTemplate: "https://www.npmjs.com/package/keytrace-{slugHandle}",
    instructions: [
      "Create a new folder with a `package.json` containing the verification content below",
      "Run `npm publish --access public` to publish",
      "Paste the npm package URL below",
    ],
    proofTemplate: `{
  "name": "keytrace-{slugHandle}",
  "version": "0.0.1",
  "keytrace": "{claimId}",
  "did": "{did}"
}`,
  },

  processURI(uri, match) {
    const [, packageName] = match;
    // Extract the handle from keytrace-handle
    const handle = packageName.replace(/^keytrace-/i, "");

    return {
      profile: {
        display: `~${handle}`,
        uri: `https://www.npmjs.com/~${handle}`,
      },
      proof: {
        request: {
          // Use npm registry to get the packument with full metadata
          uri: `https://registry.npmjs.org/${packageName}`,
          fetcher: "http",
          format: "json",
        },
        target: [
          // Check for DID in the did field of any version
          // The packument has versions as an object: { versions: { "0.0.1": { did: "did:...", keytrace: "..." } } }
          {
            path: ["versions", "*", "did"],
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
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

  getProofText(did, handle) {
    const slug = handle ? slugifyHandle(handle) : "[your-handle]";
    return `{
  "name": "keytrace-${slug}",
  "version": "0.0.1",
  "keytrace": "[claim-id]",
  "did": "${did}"
}`;
  },

  getProofLocation() {
    return `Publish an npm package named keytrace-[your-handle] with your DID in the keytrace field of package.json`;
  },

  tests: [
    { uri: "https://www.npmjs.com/package/keytrace-alice", shouldMatch: true },
    { uri: "https://npmjs.com/package/keytrace-alice", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/keytrace-alice/", shouldMatch: true },
    { uri: "https://www.npmjs.com/package/some-other-pkg", shouldMatch: false },
    { uri: "https://www.npmjs.com/~alice", shouldMatch: false },
  ],
};

export default npm;
