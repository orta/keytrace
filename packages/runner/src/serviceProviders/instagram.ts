import type { ServiceProvider } from "./types.js";

/**
 * Instagram service provider
 *
 * Users prove ownership of their Instagram account by posting a public post
 * containing their DID. The post URL is used as the claim URI.
 *
 * Fetching uses the og-meta format to extract Open Graph meta tags from the
 * Instagram post page HTML.
 */
const instagram: ServiceProvider = {
  id: "instagram",
  name: "Instagram",
  homepage: "https://www.instagram.com",

  // Match Instagram post URLs
  // Format: https://www.instagram.com/p/{post-id}/
  // Or: https://www.instagram.com/{username}/p/{post-id}/
  reUri: /^https:\/\/www\.instagram\.com\/(?:([^/]+)\/)?p\/([A-Za-z0-9_-]+)\/?$/,

  isAmbiguous: false,

  ui: {
    description: "Link via an Instagram post",
    icon: "instagram",
    inputLabel: "Instagram Post URL",
    inputPlaceholder: "https://www.instagram.com/p/...",
    instructions: [
      "Post a new **public post** on Instagram",
      "Paste the verification content below as the post caption",
      "Make sure the post is **public** (not private or for close friends)",
      "Copy the URL of the post (tap ... → Copy link)",
      "Paste the post URL below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(uri, match) {
    const [, username, postId] = match;

    // Clean URL - remove query parameters and trailing slashes
    const cleanUri = `https://www.instagram.com/p/${postId}/`;

    return {
      profile: {
        display: username ? `@${username}` : postId,
        uri: username ? `https://www.instagram.com/${username}/` : cleanUri,
      },
      proof: {
        request: {
          uri: cleanUri,
          fetcher: "http",
          format: "og-meta",
          options: {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          },
        },
        target: [
          // Check og:title (format: "Author Name on Instagram: "post text"")
          {
            path: ["title"],
            relation: "contains",
            format: "text",
          },
          // Check og:description (format: "X likes, Y comments - username on date: "post text"")
          {
            path: ["description"],
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
  },

  postprocess(data, match) {
    const [, usernameFromUrl] = match;

    type InstagramOgMeta = {
      title?: string;
      description?: string;
      url?: string;
      username?: string;
      image?: string;
    };

    const ogData = data as InstagramOgMeta;

    // Extract username from various sources
    let username = usernameFromUrl || ogData.username;

    // Try to extract from og:title (format: "Author Name on Instagram: ...")
    if (!username && ogData.title) {
      const titleMatch = ogData.title.match(/^([^:]+) on Instagram:/);
      if (titleMatch) {
        username = titleMatch[1];
      }
    }

    // Try to extract from og:description (format: "... - username on ...")
    if (!username && ogData.description) {
      const descMatch = ogData.description.match(/- ([a-zA-Z0-9._]+) on /);
      if (descMatch) {
        username = descMatch[1];
      }
    }

    // Try to extract from og:url
    if (!username && ogData.url) {
      const urlMatch = ogData.url.match(/instagram\.com\/([^/]+)\//);
      if (urlMatch) {
        username = urlMatch[1];
      }
    }

    const displayName = ogData.title?.split(' on Instagram:')[0];
    const avatarUrl = ogData.image;

    return {
      subject: username || "unknown",
      avatarUrl,
      profileUrl: username ? `https://www.instagram.com/${username}/` : undefined,
      displayName,
    };
  },

  getProofText(did) {
    return `I'm linking my keytrace.dev: ${did}`;
  },

  getProofLocation() {
    return `Post a public Instagram post containing your DID in the caption`;
  },

  tests: [
    { uri: "https://www.instagram.com/p/DVS8Tm6DWzP/", shouldMatch: true },
    { uri: "https://www.instagram.com/p/ABC123xyz/", shouldMatch: true },
    { uri: "https://www.instagram.com/orta/p/DVS8Tm6DWzP/", shouldMatch: true },
    { uri: "https://www.instagram.com/alice/p/ABC123/", shouldMatch: true },
    // With trailing slash
    { uri: "https://www.instagram.com/p/ABC123/", shouldMatch: true },
    // Profile URLs should NOT match
    { uri: "https://www.instagram.com/orta/", shouldMatch: false },
    { uri: "https://www.instagram.com/alice", shouldMatch: false },
    // Reel URLs should NOT match
    { uri: "https://www.instagram.com/reel/ABC123/", shouldMatch: false },
    // Stories should NOT match
    { uri: "https://www.instagram.com/stories/alice/123/", shouldMatch: false },
    // Wrong domain
    { uri: "https://twitter.com/alice/status/123", shouldMatch: false },
    { uri: "https://facebook.com/alice/posts/123", shouldMatch: false },
  ],
};

export default instagram;
