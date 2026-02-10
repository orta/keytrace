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

  ui: {
    description: "Link another Bluesky account",
    icon: "cloud",
    inputLabel: "Profile URL",
    inputPlaceholder: "https://bsky.app/profile/username.bsky.social",
    instructions: [
      "Log into the Bluesky account you want to link",
      "Go to **Settings** → **Edit Profile**",
      "Add your DID to your **bio** (the verification DID, not this account's DID)",
      "Save your profile changes",
      "Paste the profile URL below",
    ],
    proofTemplate: "{did}",
  },

  processURI(uri, match) {
    const [, handle] = match;

    return {
      profile: {
        display: handle.startsWith("did:") ? handle : `@${handle}`,
        uri,
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

  getProofLocation() {
    return `Add to your profile bio`;
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
