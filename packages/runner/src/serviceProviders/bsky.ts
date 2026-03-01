import type { ServiceProvider } from "./types.js";

/**
 * Bluesky service provider
 *
 * Users can prove ownership of their Bluesky account in two ways:
 * 1. Add their DID to their profile bio
 * 2. Create a post containing their DID
 *
 * The claim URI can be either a profile URL or a post URL.
 */
const bsky: ServiceProvider = {
  id: "bsky",
  name: "Bluesky",
  homepage: "https://bsky.app",

  // Match both profile URLs and post URLs:
  // Profile: https://bsky.app/profile/handle
  // Post: https://bsky.app/profile/handle/post/rkey
  reUri: /^https:\/\/bsky\.app\/profile\/([^/]+)(?:\/post\/([a-zA-Z0-9]+))?\/?$/,

  isAmbiguous: false,

  ui: {
    description: "Link via your Bluesky profile or post",
    icon: "cloud",
    inputLabel: "Profile or Post URL",
    inputPlaceholder: "https://bsky.app/profile/username.bsky.social",
    instructions: [
      "**Option 1:** Add to your profile bio at [bsky.app](https://bsky.app) → **Settings** → **Edit Profile**",
      "**Option 2:** Create a post containing the verification content",
      "Copy the URL of your profile or post",
      "Paste the URL below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(uri, match) {
    const [, handle, postRkey] = match;

    // Determine if this is a profile or a post
    const isPost = postRkey !== undefined;

    if (isPost) {
      // Post verification - need to fetch the post and check its text
      return {
        profile: {
          display: handle.startsWith("did:") ? handle : `@${handle}`,
          uri: `https://bsky.app/profile/${handle}`,
        },
        proof: {
          request: {
            uri: `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${handle}/app.bsky.feed.post/${postRkey}`,
            fetcher: "http",
            format: "json",
          },
          target: [
            // Check post text
            { path: ["thread", "post", "record", "text"], relation: "contains", format: "text" },
          ],
        },
      };
    } else {
      // Profile verification - check bio
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
    }
  },

  postprocess(data, match) {
    const [, handle, postRkey] = match;
    const isPost = postRkey !== undefined;

    if (isPost) {
      // Extract author info from post thread response
      const thread = data as { thread?: { post?: { author?: { handle?: string; displayName?: string; avatar?: string } } } };
      const author = thread.thread?.post?.author;

      return {
        subject: author?.handle || handle,
        displayName: author?.displayName || author?.handle || handle,
        profileUrl: `https://bsky.app/profile/${author?.handle || handle}`,
        avatarUrl: author?.avatar,
      };
    } else {
      // Profile data is already in the right format from getProfile
      const profile = data as { handle?: string; displayName?: string; avatar?: string };

      return {
        subject: profile.handle || handle,
        displayName: profile.displayName || profile.handle || handle,
        profileUrl: `https://bsky.app/profile/${profile.handle || handle}`,
        avatarUrl: profile.avatar,
      };
    }
  },

  getProofText(did) {
    return `I'm linking my keytrace.dev: ${did}`;
  },

  getProofLocation() {
    return `Add to your Bluesky profile bio, or create a post containing it`;
  },

  tests: [
    // Profile URLs
    { uri: "https://bsky.app/profile/alice.bsky.social", shouldMatch: true },
    { uri: "https://bsky.app/profile/did:plc:abc123", shouldMatch: true },
    { uri: "https://bsky.app/profile/alice.bsky.social/", shouldMatch: true },
    // Post URLs
    { uri: "https://bsky.app/profile/alice.bsky.social/post/3l7wnw7i5me2s", shouldMatch: true },
    { uri: "https://bsky.app/profile/alice.bsky.social/post/abc123xyz", shouldMatch: true },
    { uri: "https://bsky.app/profile/did:plc:abc123/post/3l7wnw7i5me2s", shouldMatch: true },
    // Should NOT match other Bluesky URLs
    { uri: "https://bsky.social/profile/alice", shouldMatch: false },
    { uri: "https://bsky.app/profile/alice/feed/123", shouldMatch: false },
  ],
};

export default bsky;
