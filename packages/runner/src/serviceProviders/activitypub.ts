import type { ServiceProvider } from "./types.js";

/**
 * ActivityPub (Mastodon/Fediverse) service provider
 *
 * Users prove ownership by adding their DID to their profile bio or fields.
 * The claim URI is the profile URL (e.g., https://mastodon.social/@username)
 */
const activitypub: ServiceProvider = {
  id: "activitypub",
  name: "Mastodon",
  homepage: "https://joinmastodon.org",

  // Match Mastodon-style profile URLs: https://instance/@username
  reUri: /^https:\/\/([^/]+)\/@([^/]+)\/?$/,

  // Could match other ActivityPub software with same URL pattern
  isAmbiguous: true,

  ui: {
    description: "Link your Mastodon or Fediverse account",
    icon: "at-sign",
    inputLabel: "Profile URL",
    inputPlaceholder: "https://mastodon.social/@username",
    instructions: [
      "Go to your Mastodon instance and open **Edit profile**",
      "Add your DID to your **bio** or create a new **profile metadata field**",
      "For metadata fields, set the label to `keytrace` and paste your DID as the value",
      "Save your profile changes",
      "Paste your full profile URL below (e.g., `https://mastodon.social/@username`)",
    ],
    proofTemplate: "{did}",
  },

  processURI(uri, match) {
    const [, domain, username] = match;

    return {
      profile: {
        display: `@${username}@${domain}`,
        uri,
        qrcode: true,
      },
      proof: {
        request: {
          uri,
          fetcher: "activitypub",
          format: "json",
        },
        target: [
          // Check profile bio/summary (HTML content)
          { path: ["summary"], relation: "contains", format: "text" },
          // Check profile fields (Mastodon-style verification fields)
          { path: ["attachment", "*", "value"], relation: "contains", format: "text" },
        ],
      },
    };
  },

  postprocess(data) {
    const actor = data as { preferredUsername?: string; name?: string; icon?: { url?: string } };
    return {
      displayName: actor.name || actor.preferredUsername,
      avatarUrl: actor.icon?.url,
    };
  },

  getProofText(did) {
    return did;
  },

  getProofLocation() {
    return `Add to your profile bio or a profile metadata field`;
  },

  tests: [
    { uri: "https://mastodon.social/@alice", shouldMatch: true },
    { uri: "https://fosstodon.org/@bob/", shouldMatch: true },
    { uri: "https://hachyderm.io/@user", shouldMatch: true },
    { uri: "https://twitter.com/alice", shouldMatch: false },
    { uri: "https://mastodon.social/alice", shouldMatch: false },
  ],
};

export default activitypub;
