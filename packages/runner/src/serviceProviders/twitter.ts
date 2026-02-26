import type { ServiceProvider } from "./types.js";

/**
 * Twitter / X service provider
 *
 * Users prove ownership of their Twitter/X account by posting a tweet
 * containing their DID. The tweet URL is used as the claim URI.
 *
 * Fetching uses the `twitter` fetcher which authenticates with Twitter's
 * public bearer token + guest token to call the GraphQL TweetResultByRestId
 * endpoint server-side.
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
    proofTemplate: "{did}",
  },

  processURI(uri, match) {
    const [, , username] = match;

    return {
      profile: {
        display: `@${username}`,
        uri: `https://x.com/${username}`,
      },
      proof: {
        request: {
          // The twitter fetcher accepts the canonical tweet URL and handles auth
          uri,
          fetcher: "twitter",
          format: "json",
        },
        target: [
          // The tweet's full text must contain the DID
          {
            path: ["data", "tweetResult", "result", "legacy", "full_text"],
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
  },

  postprocess(data, match) {
    const [, , username] = match;

    type GraphQLData = {
      data?: {
        tweetResult?: {
          result?: {
            core?: {
              user_results?: {
                result?: {
                  core?: { screen_name?: string };
                  legacy?: { screen_name?: string; profile_image_url_https?: string; name?: string };
                };
              };
            };
          };
        };
      };
    };

    const gql = data as GraphQLData;
    const userResult = gql?.data?.tweetResult?.result?.core?.user_results?.result;
    const screenName = userResult?.core?.screen_name ?? userResult?.legacy?.screen_name ?? username;
    const avatarUrl = userResult?.legacy?.profile_image_url_https?.replace(/_normal\./, ".");
    const displayName = userResult?.legacy?.name;

    return {
      subject: screenName,
      avatarUrl,
      profileUrl: `https://x.com/${screenName}`,
      displayName,
    };
  },

  getProofText(did) {
    return did;
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
