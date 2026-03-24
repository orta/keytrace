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

  // Match Reddit post and comment URLs:
  // Post:    https://www.reddit.com/r/{sub}/comments/{postId}/{slug}/
  // Comment: https://www.reddit.com/r/{sub}/comments/{postId}/{slug}/{commentId}/
  // User:    https://www.reddit.com/user/{username}/comments/{postId}/{slug}/
  // Share:   https://www.reddit.com/u/{username}/s/{shareId}
  // Also supports old.reddit.com
  reUri: /^https:\/\/(www\.|old\.)?reddit\.com\/(?:(r\/[a-zA-Z0-9_]+|user\/[a-zA-Z0-9_-]+)\/comments\/([a-z0-9]+)(?:\/([^/?]+)(?:\/([a-z0-9]+))?)?\/?\??[^/]*|(u\/[a-zA-Z0-9_-]+)\/s\/([a-zA-Z0-9]+)\/?(\?.*)?)$/,

  isAmbiguous: false,

  ui: {
    description: "Link via a Reddit post",
    icon: "message-square",
    inputLabel: "Reddit Post URL",
    inputPlaceholder: "https://www.reddit.com/r/subreddit/comments/...",
    instructions: [
      "Create a new **public post or comment** on Reddit (you can post in [r/keytrace](https://www.reddit.com/r/keytrace/) if you'd like)",
      "Paste the verification content below as the post text or comment body",
      "Make sure the post is **public** (not in a private subreddit)",
      "Copy the URL of the post or comment (click 'share' → 'copy link')",
      "Paste the URL below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(uri, match) {
    const [, , subredditOrUser, , , commentId, shareUser, shareId] = match;

    const cleanUri = uri.split("?")[0].split("#")[0];

    // Share link format: /u/{username}/s/{shareId}
    // Reddit's JSON API follows the redirect, returning the post/comment data
    if (shareId) {
      const jsonUri = `https://www.reddit.com/${shareUser}/s/${shareId}.json`;
      return {
        profile: {
          display: shareUser,
          uri: `https://www.reddit.com/${shareUser}`,
        },
        proof: {
          request: {
            uri: jsonUri,
            fetcher: "reddit",
            format: "json",
            options: { headers: { "User-Agent": "keytrace-runner/1.0 (identity verification bot)" } },
          },
          target: [
            { path: ["0", "data", "children", "0", "data", "selftext"], relation: "contains", format: "text" },
            { path: ["1", "data", "children", "0", "data", "body"], relation: "contains", format: "text" },
          ],
        },
      };
    }

    const jsonUri = cleanUri.endsWith("/") ? `${cleanUri}.json` : `${cleanUri}/.json`;
    const isUserPost = subredditOrUser.startsWith("user/");
    const communityName = isUserPost ? subredditOrUser.replace("user/", "u/") : subredditOrUser;
    const isComment = !!commentId;

    return {
      profile: {
        display: communityName,
        uri: `https://www.reddit.com/${subredditOrUser}`,
      },
      proof: {
        request: {
          uri: jsonUri,
          fetcher: "reddit",
          format: "json",
          options: { headers: { "User-Agent": "keytrace-runner/1.0 (identity verification bot)" } },
        },
        target: isComment
          ? [
              // Comment body
              { path: ["1", "data", "children", "0", "data", "body"], relation: "contains", format: "text" },
            ]
          : [
              // Post selftext
              { path: ["0", "data", "children", "0", "data", "selftext"], relation: "contains", format: "text" },
              // Post title as fallback
              { path: ["0", "data", "children", "0", "data", "title"], relation: "contains", format: "text" },
            ],
      },
    };
  },

  postprocess(data, match) {
    type RedditChild = {
      data?: { id?: string; author?: string; subreddit?: string; title?: string; selftext?: string; body?: string };
    };
    type RedditJsonResponse = { data?: { children?: RedditChild[] } };

    const [, , , , , commentId, shareUser] = match;
    const arr = Array.isArray(data) ? (data as RedditJsonResponse[]) : [data as RedditJsonResponse];

    const commentNode = arr[1]?.data?.children?.[0]?.data;
    const postNode = arr[0]?.data?.children?.[0]?.data;

    // Mitigation 1: for comment permalinks, verify the fetched comment ID matches
    // the one in the URL to prevent comment thread parent traversal abuse.
    if (commentId && commentNode?.id && commentNode.id !== commentId) {
      throw new Error(`Comment ID mismatch: expected ${commentId}, got ${commentNode.id}`);
    }

    // For comment/share links the author is in [1] (comment listing), fall back to [0] (post)
    const author = commentNode?.author || postNode?.author;

    // Mitigation 2: for share links, verify the content author matches the username
    // in the share URL — the sharer and the author must be the same person.
    if (shareUser) {
      const expectedUsername = shareUser.replace("u/", "");
      if (author && author.toLowerCase() !== expectedUsername.toLowerCase()) {
        throw new Error(`Share link author mismatch: URL user is ${expectedUsername}, content author is ${author}`);
      }
    }

    const profileUrl = author ? `https://www.reddit.com/user/${author}` : undefined;

    return {
      subject: author || "unknown",
      displayName: author ? `u/${author}` : undefined,
      profileUrl,
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
    // Comment permalinks
    { uri: "https://www.reddit.com/r/test/comments/abc123/post/def456/", shouldMatch: true },
    { uri: "https://www.reddit.com/r/keytrace/comments/abc123/my_post/xyz789/", shouldMatch: true },
    // Share links
    { uri: "https://www.reddit.com/u/mbStavola/s/WsB40s266p", shouldMatch: true },
    { uri: "https://www.reddit.com/u/alice/s/ABC123xyz/", shouldMatch: true },
    // With query parameters
    { uri: "https://www.reddit.com/r/test/comments/abc123/post/?utm_source=share", shouldMatch: true },
    // Should NOT match profile pages
    { uri: "https://www.reddit.com/user/alice", shouldMatch: false },
    { uri: "https://www.reddit.com/r/test", shouldMatch: false },
    { uri: "https://www.reddit.com/r/test/", shouldMatch: false },
    // Wrong domain
    { uri: "https://twitter.com/alice/status/123", shouldMatch: false },
    { uri: "https://redd.it/abc123", shouldMatch: false },
  ],
};

export default reddit;
