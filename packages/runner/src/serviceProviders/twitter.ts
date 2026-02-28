import type { ServiceProvider } from "./types.js";

/**
 * Twitter / X service provider
 *
 * Users prove ownership of their Twitter/X account by posting a tweet
 * containing their DID. The tweet URL is used as the claim URI.
 *
 * Fetching uses the FxEmbed API (https://api.fxtwitter.com/) which provides
 * public tweet data without authentication.
 */
const twitter: ServiceProvider = {
  id: "twitter",
  name: "Twitter / X",
  homepage: "https://x.com",

  // Match twitter.com or x.com status URLs
  reUri: /^https:\/\/(twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})\/status\/(\d+)\/?$/,

  isAmbiguous: false,

  ui: {
    description: "Link via a tweet",
    icon: "twitter",
    inputLabel: "Tweet URL",
    inputPlaceholder: "https://x.com/username/status/1234567890",
    instructions: [
      "Post a new **public tweet** on Twitter / X",
      "Paste the verification content below as the tweet text",
      "Copy the URL of the tweet (click the tweet timestamp → copy link)",
      "Paste the tweet URL below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(uri, match) {
    const [, , username, tweetId] = match;

    return {
      profile: {
        display: `@${username}`,
        uri: `https://x.com/${username}`,
      },
      proof: {
        request: {
          // Use FxEmbed API to fetch tweet data
          uri: `https://api.fxtwitter.com/${username}/status/${tweetId}`,
          fetcher: "http",
          format: "json",
          options: {
            headers: {
              "User-Agent": "keytrace-runner/1.0",
            },
          },
        },
        target: [
          // The tweet's text must contain the DID
          {
            path: ["tweet", "text"],
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
  },

  postprocess(data, match) {
    const [, , username] = match;

    type FxEmbedResponse = {
      code?: number;
      message?: string;
      tweet?: {
        text?: string;
        author?: {
          screen_name?: string;
          name?: string;
          avatar_url?: string;
        };
      };
    };

    const response = data as FxEmbedResponse;
    const author = response?.tweet?.author;
    const screenName = author?.screen_name ?? username;
    const avatarUrl = author?.avatar_url;
    const displayName = author?.name;

    return {
      subject: screenName,
      avatarUrl,
      profileUrl: `https://x.com/${screenName}`,
      displayName,
    };
  },

  getProofText(did) {
    return `I'm linking my keytrace.dev: ${did}`;
  },

  getProofLocation() {
    return `Post a public tweet containing your DID`;
  },

  tests: [
    { uri: "https://twitter.com/alice/status/1234567890", shouldMatch: true },
    { uri: "https://x.com/alice/status/1234567890", shouldMatch: true },
    { uri: "https://x.com/alice/status/1234567890/", shouldMatch: true },
    { uri: "https://x.com/Alice_Dev123/status/9876543210", shouldMatch: true },
    // No status path
    { uri: "https://twitter.com/alice", shouldMatch: false },
    { uri: "https://x.com/alice", shouldMatch: false },
    // Wrong domain
    { uri: "https://twitch.tv/alice/status/123", shouldMatch: false },
    // Non-numeric tweet ID
    { uri: "https://x.com/alice/status/abc", shouldMatch: false },
    // Username too long (>15 chars)
    { uri: "https://x.com/averylongusername123/status/123", shouldMatch: false },
  ],
};

export default twitter;
