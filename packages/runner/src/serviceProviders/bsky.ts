import type { ServiceProvider } from "./types.js";

/**
 * Bluesky service provider
 *
 * Users prove ownership of another Bluesky account by adding their DID to the profile bio.
 * The claim URI is the bsky.app profile URL.
 */
const bsky: ServiceProvider = {
  id: "bsky",
  name: "Bluesky",
  homepage: "https://bsky.app",

  // Match Bluesky profile URLs: https://bsky.app/profile/handle or did
  reUri: /^https:\/\/bsky\.app\/profile\/([^/]+)\/?$/,

  isAmbiguous: false,

  processURI(uri, match) {
    const [, handle] = match;

    return {
      profile: {
        display: handle.startsWith("did:") ? handle : `@${handle}`,
        uri,
        qrcode: true,
      },
      proof: {
        request: {
          uri: `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
          fetcher: "http",
          format: "json",
        },
        target: [
          // Check profile description/bio
          { path: ["description"], relation: "contains", format: "text" },
        ],
      },
    };
  },

  getProofText(did) {
    return did;
  },

  tests: [
    { uri: "https://bsky.app/profile/alice.bsky.social", shouldMatch: true },
    { uri: "https://bsky.app/profile/did:plc:abc123", shouldMatch: true },
    { uri: "https://bsky.app/profile/alice.bsky.social/", shouldMatch: true },
    { uri: "https://bsky.app/profile/alice/post/123", shouldMatch: false },
    { uri: "https://bsky.social/profile/alice", shouldMatch: false },
  ],
};

export default bsky;
