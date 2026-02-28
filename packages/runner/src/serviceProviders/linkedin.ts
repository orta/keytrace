import type { ServiceProvider } from "./types.js";

/**
 * LinkedIn service provider
 *
 * Users prove ownership of their LinkedIn account by posting a public post
 * containing their DID. The post URL is used as the claim URI.
 *
 * Fetching uses the json-ld format to extract structured data from the
 * LinkedIn post page's JSON-LD script tag.
 */
const linkedin: ServiceProvider = {
  id: "linkedin",
  name: "LinkedIn",
  homepage: "https://www.linkedin.com",

  // Match LinkedIn post URLs
  // Format: https://www.linkedin.com/posts/{username}_{slug}_{activity-id}-{suffix}?{query-params}
  // Examples:
  //   - https://www.linkedin.com/posts/ortatherox_keytrace-you-be-you-everywhere-share-7433426718113312769-vxsa
  //   - https://www.linkedin.com/posts/ortatherox_keytrace-you-be-you-everywhere-activity-7433426718700449792-_B5S
  reUri: /^https:\/\/www\.linkedin\.com\/posts\/([a-zA-Z0-9_-]+)_[^?]*/,

  isAmbiguous: false,

  ui: {
    description: "Link via a LinkedIn post",
    icon: "linkedin",
    inputLabel: "LinkedIn Post URL",
    inputPlaceholder: "https://www.linkedin.com/posts/username_...",
    instructions: [
      "Post a new **public post** on LinkedIn",
      "Paste the verification content below as the post text",
      "Make sure the post visibility is set to **Public**",
      "Copy the URL of the post (click the post timestamp → copy link)",
      "Paste the post URL below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(uri, match) {
    const [, username] = match;

    return {
      profile: {
        display: username,
        uri: `https://www.linkedin.com/in/${username}`,
      },
      proof: {
        request: {
          uri: uri.split('?')[0], // Remove query parameters
          fetcher: "http",
          format: "json-ld",
          options: {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; KeytraceBot/1.0)",
            },
          },
        },
        target: [
          // Check the post's articleBody field
          {
            path: ["articleBody"],
            relation: "contains",
            format: "text",
          },
          // Also check the text field as fallback
          {
            path: ["text"],
            relation: "contains",
            format: "text",
          },
          // Check headline as another fallback
          {
            path: ["headline"],
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
  },

  postprocess(data, match) {
    const [, username] = match;

    type LinkedInJsonLd = {
      "@type"?: string;
      articleBody?: string;
      text?: string;
      headline?: string;
      author?: {
        name?: string;
        url?: string;
        image?: {
          url?: string;
        };
      };
    };

    const jsonLd = data as LinkedInJsonLd;
    const author = jsonLd?.author;
    const authorName = author?.name;
    const authorUrl = author?.url;
    const avatarUrl = author?.image?.url;

    // Extract username from author URL if available (format: https://uk.linkedin.com/in/username)
    let extractedUsername = username;
    if (authorUrl) {
      const urlMatch = authorUrl.match(/\/in\/([^/?]+)/);
      if (urlMatch) {
        extractedUsername = urlMatch[1];
      }
    }

    return {
      subject: extractedUsername,
      avatarUrl,
      profileUrl: `https://www.linkedin.com/in/${extractedUsername}`,
      displayName: authorName,
    };
  },

  getProofText(did) {
    return `I'm linking my keytrace.dev: ${did}`;
  },

  getProofLocation() {
    return `Post a public LinkedIn post containing your DID`;
  },

  tests: [
    { uri: "https://www.linkedin.com/posts/ortatherox_keytrace-you-be-you-everywhere-share-7433426718113312769-vxsa", shouldMatch: true },
    { uri: "https://www.linkedin.com/posts/ortatherox_keytrace-you-be-you-everywhere-activity-7433426718700449792-_B5S", shouldMatch: true },
    { uri: "https://www.linkedin.com/posts/alice_some-post-activity-1234567890-abcd", shouldMatch: true },
    { uri: "https://www.linkedin.com/posts/alice_some-post-activity-1234567890-abcd?utm_source=share", shouldMatch: true },
    // No posts path
    { uri: "https://www.linkedin.com/in/alice", shouldMatch: false },
    { uri: "https://www.linkedin.com/feed/", shouldMatch: false },
    // Comment URLs should NOT match (security: prevents using someone else's post + your comment)
    { uri: "https://www.linkedin.com/feed/update/urn:li:activity:7433094511582498816/?dashCommentUrn=urn%3Ali%3Afsd_comment%3A%287433098855795228672%2Curn%3Ali%3Aactivity%3A7433094511582498816%29", shouldMatch: false },
    { uri: "https://www.linkedin.com/feed/update/urn:li:activity:123456/", shouldMatch: false },
    // Wrong domain
    { uri: "https://twitter.com/alice/status/123", shouldMatch: false },
    { uri: "https://facebook.com/alice/posts/123", shouldMatch: false },
  ],
};

export default linkedin;
