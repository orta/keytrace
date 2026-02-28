import type { ServiceProvider } from "./types.js";

/**
 * Reddit service provider
 *
 * Users prove ownership of their Reddit account by creating a public post
 * containing their DID. The post URL is used as the claim URI.
 *
 * Fetching uses Reddit's JSON API (append .json to any URL) which provides
 * public post data without authentication.
 */
const reddit: ServiceProvider = {
  id: "reddit",
  name: "Reddit",
  homepage: "https://www.reddit.com",

  // Match Reddit post URLs
  // Format: https://www.reddit.com/r/{subreddit}/comments/{post-id}/{slug}/
  // Or: https://www.reddit.com/user/{username}/comments/{post-id}/{slug}/
  // Also supports old.reddit.com
  // IMPORTANT: Only match post URLs, not comment permalinks (which have an extra ID after the slug)
  reUri: /^https:\/\/(www\.|old\.)?reddit\.com\/(r\/[a-zA-Z0-9_]+|user\/[a-zA-Z0-9_-]+)\/comments\/([a-z0-9]+)(?:\/[^/?]+)?\/?\??[^/]*$/,

  isAmbiguous: false,

  ui: {
    description: "Link via a Reddit post",
    icon: "message-square",
    inputLabel: "Reddit Post URL",
    inputPlaceholder: "https://www.reddit.com/r/subreddit/comments/...",
    instructions: [
      "Create a new **public post** on Reddit (you can post in [r/keytrace](https://www.reddit.com/r/keytrace/) if you'd like)",
      "Paste the verification content below as the post text (or in a comment if it's a link post)",
      "Make sure the post is **public** (not in a private subreddit)",
      "Copy the URL of the post (click 'share' → 'copy link')",
      "Paste the post URL below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(uri, match) {
    const [, , subredditOrUser, postId] = match;

    // Clean the URI - remove query parameters and ensure proper format
    const cleanUri = uri.split("?")[0].split("#")[0];
    // Reddit's JSON API: append .json to the URL
    const jsonUri = cleanUri.endsWith("/") ? `${cleanUri}.json` : `${cleanUri}/.json`;

    // Determine if this is a user post or subreddit post
    const isUserPost = subredditOrUser.startsWith("user/");
    const communityName = isUserPost
      ? subredditOrUser.replace("user/", "u/")
      : subredditOrUser;

    return {
      profile: {
        display: communityName,
        uri: `https://www.reddit.com/${subredditOrUser}`,
      },
      proof: {
        request: {
          uri: jsonUri,
          fetcher: "http",
          format: "json",
          options: {
            headers: {
              "User-Agent": "keytrace-runner/1.0 (identity verification bot)",
            },
          },
        },
        target: [
          // Check the post's selftext field (for text posts)
          {
            path: ["0", "data", "children", "0", "data", "selftext"],
            relation: "contains",
            format: "text",
          },
          // Also check the title as fallback
          {
            path: ["0", "data", "children", "0", "data", "title"],
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
  },

  postprocess(data, match) {
    type RedditJsonResponse = {
      data?: {
        children?: Array<{
          data?: {
            author?: string;
            subreddit?: string;
            title?: string;
            selftext?: string;
            thumbnail?: string;
            url?: string;
          };
        }>;
      };
    };

    // Reddit's JSON response is an array, first element contains the post
    const response = (Array.isArray(data) ? data[0] : data) as RedditJsonResponse;
    const postData = response?.data?.children?.[0]?.data;

    const author = postData?.author;
    const subreddit = postData?.subreddit;
    const title = postData?.title;

    // Reddit doesn't provide avatar URLs in the JSON API, but we can construct profile URL
    const profileUrl = author ? `https://www.reddit.com/user/${author}` : undefined;

    return {
      subject: author || "unknown",
      displayName: author ? `u/${author}` : undefined,
      profileUrl,
      // Reddit doesn't provide avatar URLs in the basic JSON API
      avatarUrl: undefined,
    };
  },

  getProofText(did) {
    return `I'm linking my keytrace.dev: ${did}`;
  },

  getProofLocation() {
    return `Create a public Reddit post containing your DID in the post text or title`;
  },

  tests: [
    // Subreddit posts
    { uri: "https://www.reddit.com/r/test/comments/abc123/my_post/", shouldMatch: true },
    { uri: "https://www.reddit.com/r/test/comments/abc123/my_post", shouldMatch: true },
    { uri: "https://www.reddit.com/r/keytrace/comments/xyz789/verification/", shouldMatch: true },
    { uri: "https://old.reddit.com/r/test/comments/abc123/my_post/", shouldMatch: true },
    // User profile posts
    { uri: "https://www.reddit.com/user/alice/comments/abc123/my_post/", shouldMatch: true },
    { uri: "https://www.reddit.com/user/alice/comments/abc123/", shouldMatch: true },
    // With query parameters
    { uri: "https://www.reddit.com/r/test/comments/abc123/post/?utm_source=share", shouldMatch: true },
    // Should NOT match profile pages
    { uri: "https://www.reddit.com/user/alice", shouldMatch: false },
    { uri: "https://www.reddit.com/r/test", shouldMatch: false },
    { uri: "https://www.reddit.com/r/test/", shouldMatch: false },
    // Should NOT match comment permalinks (security: prevents using someone else's post + your comment)
    { uri: "https://www.reddit.com/r/test/comments/abc123/post/def456/", shouldMatch: false },
    // Wrong domain
    { uri: "https://twitter.com/alice/status/123", shouldMatch: false },
    { uri: "https://redd.it/abc123", shouldMatch: false }, // Short URLs not supported (they redirect)
  ],
};

export default reddit;
