import type { ServiceProvider } from "./types.js";

/**
 * GitHub Gist service provider
 *
 * Users prove ownership by creating a public gist containing their DID.
 * The gist URL is used as the claim URI.
 */
const github: ServiceProvider = {
  id: "github",
  name: "GitHub",
  homepage: "https://github.com",

  // Match GitHub Gist URLs: https://gist.github.com/username/gistid
  reUri: /^https:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)\/?$/,

  isAmbiguous: false,

  processURI(uri, match) {
    const [, username, gistId] = match;

    return {
      profile: {
        display: `@${username}`,
        uri: `https://github.com/${username}`,
        qrcode: true,
      },
      proof: {
        request: {
          uri: `https://api.github.com/gists/${gistId}`,
          fetcher: "http",
          format: "json",
          options: {
            headers: {
              Accept: "application/vnd.github.v3+json",
            },
          },
        },
        target: [
          // Check keytrace.json file content
          {
            path: ["files", "keytrace.json", "content"],
            relation: "contains",
            format: "text",
          },
          // Check proof.md file content
          {
            path: ["files", "proof.md", "content"],
            relation: "contains",
            format: "text",
          },
          // Check keytrace.md file content
          {
            path: ["files", "keytrace.md", "content"],
            relation: "contains",
            format: "text",
          },
          // Check openpgp.md for backwards compatibility with Keyoxide
          {
            path: ["files", "openpgp.md", "content"],
            relation: "contains",
            format: "text",
          },
          // Check gist description
          { path: ["description"], relation: "contains", format: "text" },
        ],
      },
    };
  },

  getProofText(did) {
    return `Verifying my identity on keytrace: ${did}`;
  },

  tests: [
    { uri: "https://gist.github.com/alice/abc123def456", shouldMatch: true },
    { uri: "https://gist.github.com/alice/abc123def456/", shouldMatch: true },
    { uri: "https://github.com/alice", shouldMatch: false },
    { uri: "https://gist.gitlab.com/alice/abc123", shouldMatch: false },
  ],
};

export default github;
