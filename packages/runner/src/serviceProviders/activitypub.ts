import type { ServiceProvider } from "./types.js";

/**
 * ActivityPub (Mastodon/Fediverse) service provider
 *
 * Users prove ownership by adding their DID to their profile bio or fields.
 * The claim URI is the profile URL (e.g., https://mastodon.social/@username)
 */
const activitypub: ServiceProvider = {
  id: "activitypub",
  name: "ActivityPub",
  homepage: "",

  // Match Mastodon-style profile URLs: https://instance/@username
  reUri: /^https:\/\/([^/]+)\/@([^/]+)\/?$/,

  // Could match other ActivityPub software with same URL pattern
  isAmbiguous: true,

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
    const actor = data as { preferredUsername?: string; name?: string };
    return {
      display: actor.name || actor.preferredUsername,
    };
  },

  getProofText(did) {
    return did;
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
