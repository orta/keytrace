import type { ServiceProvider } from "./types.js";

/**
 * ActivityPub (Mastodon/Fediverse) service provider
 *
 * Users can prove ownership of their Mastodon/Fediverse account in two ways:
 * 1. Add their DID to their profile bio or metadata fields
 * 2. Create a post/status containing their DID
 *
 * The claim URI can be either a profile URL or a status URL.
 */
const activitypub: ServiceProvider = {
  id: "activitypub",
  name: "Mastodon",
  homepage: "https://joinmastodon.org",

  // Match both profile URLs and status URLs:
  // Profile: https://instance/@username
  // Status: https://instance/@username/123456789
  reUri: /^https:\/\/([^/]+)\/@([^/]+)(?:\/(\d+))?\/?$/,

  // Could match other ActivityPub software with same URL pattern
  isAmbiguous: true,

  ui: {
    description: "Link via your Mastodon profile or post",
    icon: "at-sign",
    inputLabel: "Profile or Post URL",
    inputPlaceholder: "https://mastodon.social/@username",
    instructions: [
      "**Option 1:** Add to your profile bio or metadata fields at **Edit profile** → add your DID to your bio or create a field labeled `keytrace`",
      "**Option 2:** Create a post/status containing the verification content",
      "Copy the URL of your profile or post",
      "Paste the URL below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(uri, match) {
    const [, domain, username, statusId] = match;

    // Determine if this is a profile or a status
    const isStatus = statusId !== undefined;

    if (isStatus) {
      // Status verification - fetch the post and check its content
      return {
        profile: {
          display: `@${username}@${domain}`,
          uri: `https://${domain}/@${username}`,
        },
        proof: {
          request: {
            uri,
            fetcher: "activitypub",
            format: "json",
          },
          target: [
            // Check status content (HTML content)
            { path: ["content"], relation: "contains", format: "text" },
          ],
        },
      };
    } else {
      // Profile verification - check bio and fields
      return {
        profile: {
          display: `@${username}@${domain}`,
          uri,
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
    }
  },

  postprocess(data, match) {
    const [, domain, username, statusId] = match;
    const isStatus = statusId !== undefined;

    if (isStatus) {
      // Extract author info from status/post
      const status = data as {
        attributedTo?: string | { preferredUsername?: string; name?: string; icon?: { url?: string } };
      };

      // attributedTo can be a string (URL) or an object (embedded actor)
      if (typeof status.attributedTo === "object" && status.attributedTo) {
        const author = status.attributedTo;
        return {
          subject: author.preferredUsername || username,
          displayName: author.name || author.preferredUsername || username,
          profileUrl: `https://${domain}/@${author.preferredUsername || username}`,
          avatarUrl: author.icon?.url,
        };
      }

      // If attributedTo is just a URL, return basic info
      return {
        subject: username,
        displayName: username,
        profileUrl: `https://${domain}/@${username}`,
        avatarUrl: undefined,
      };
    } else {
      // Profile data
      const actor = data as { preferredUsername?: string; name?: string; icon?: { url?: string } };
      return {
        subject: actor.preferredUsername || username,
        displayName: actor.name || actor.preferredUsername || username,
        profileUrl: `https://${domain}/@${actor.preferredUsername || username}`,
        avatarUrl: actor.icon?.url,
      };
    }
  },

  getProofText(did) {
    return `I'm linking my keytrace.dev: ${did}`;
  },

  getProofLocation() {
    return `Add to your profile bio or metadata field, or create a post containing it`;
  },

  tests: [
    // Profile URLs
    { uri: "https://mastodon.social/@alice", shouldMatch: true },
    { uri: "https://fosstodon.org/@bob/", shouldMatch: true },
    { uri: "https://hachyderm.io/@user", shouldMatch: true },
    // Status URLs
    { uri: "https://mastodon.social/@alice/123456789", shouldMatch: true },
    { uri: "https://fosstodon.org/@bob/987654321", shouldMatch: true },
    { uri: "https://hachyderm.io/@user/111222333", shouldMatch: true },
    { uri: "https://mastodon.social/@alice/123456789/", shouldMatch: true },
    // Should NOT match other patterns
    { uri: "https://twitter.com/alice", shouldMatch: false },
    { uri: "https://mastodon.social/alice", shouldMatch: false },
    { uri: "https://mastodon.social/@alice/activity", shouldMatch: false },
  ],
};

export default activitypub;
