import type { ServiceProvider } from "./types.js";

/**
 * Tangled service provider
 *
 * Users prove ownership of their tangled.org account by creating a
 * "string" (Tangled's equivalent of a gist) containing their DID.
 * URL format: https://tangled.org/strings/<username>/<stringId>
 * Raw content: https://tangled.org/strings/<username>/<stringId>/raw
 */
const tangled: ServiceProvider = {
  id: "tangled",
  name: "Tangled",
  homepage: "https://tangled.org",

  // Match tangled.org string URLs: https://tangled.org/strings/username/stringId
  reUri: /^https:\/\/tangled\.org\/strings\/([^/]+)\/([a-z0-9]+)\/?$/,

  isAmbiguous: false,

  ui: {
    description: "Link via a Tangled string",
    icon: "tangled",
    inputLabel: "String URL",
    inputPlaceholder: "https://tangled.org/strings/username/abc123...",
    instructions: [
      "Go to [tangled.org/strings](https://tangled.org/strings) and create a new string",
      "Name the file `keytrace.json`",
      "Paste the verification content below into the file",
      "Save the string and paste the URL below",
    ],
    proofTemplate: '{\n  "did": "{did}"\n}',
  },

  processURI(uri, match) {
    const [, username, stringId] = match;

    return {
      profile: {
        display: `@${username}`,
        uri: `https://tangled.org/${username}`,
      },
      proof: {
        request: {
          uri: `https://tangled.org/strings/${username}/${stringId}/raw`,
          fetcher: "http",
          format: "json",
        },
        target: [
          {
            path: ["did"],
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
  },

  postprocess(data, match) {
    const [, username] = match;

    return {
      subject: username,
      profileUrl: `https://tangled.org/${username}`,
    };
  },

  getProofText(did) {
    return `Verifying my identity on keytrace: ${did}`;
  },

  getProofLocation() {
    return `Create a string on tangled.org with a keytrace.json file containing the proof text`;
  },

  tests: [
    { uri: "https://tangled.org/strings/alice/abc123def", shouldMatch: true },
    { uri: "https://tangled.org/strings/orta.io/3melbs7rkoz22", shouldMatch: true },
    { uri: "https://tangled.org/strings/alice/abc123def/", shouldMatch: true },
    { uri: "https://tangled.org/alice", shouldMatch: false },
    { uri: "https://github.com/alice", shouldMatch: false },
  ],
};

export default tangled;
