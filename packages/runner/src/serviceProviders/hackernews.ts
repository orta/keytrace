import type { ServiceProvider } from "./types.js";
import * as cheerio from "cheerio";

/**
 * Hacker News service provider
 *
 * Users can prove ownership of their Hacker News account in two ways:
 * 1. Add their DID to their profile's "about" field
 * 2. Create a comment or post containing their DID
 *
 * Fetching uses HTML scraping of HN pages for real-time verification
 * (HN's Firebase API has significant indexing delays).
 */
const hackernews: ServiceProvider = {
  id: "hackernews",
  name: "Hacker News",
  homepage: "https://news.ycombinator.com",

  // Match both user profile URLs and item URLs
  // User: https://news.ycombinator.com/user?id=username
  // Item: https://news.ycombinator.com/item?id=12345678
  reUri: /^https:\/\/(news|old)\.ycombinator\.com\/(user\?id=([a-zA-Z0-9_-]+)|item\?id=(\d+))$/,

  isAmbiguous: false,

  ui: {
    description: "Link via your Hacker News profile or post",
    icon: "message-square",
    inputLabel: "Hacker News Profile or Item URL",
    inputPlaceholder: "https://news.ycombinator.com/user?id=username",
    instructions: [
      "**Option 1:** Add to your profile's about field at [profile settings](https://news.ycombinator.com/user)",
      "**Option 2:** Create a comment or post (e.g., in a [verification thread](https://news.ycombinator.com)) containing the verification content",
      "Copy the URL of your profile or post/comment",
      "Paste the URL below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(uri, match) {
    const [, , , username, itemId] = match;

    // Determine if this is a user profile or an item (comment/post)
    const isUserProfile = username !== undefined;

    if (isUserProfile) {
      // User profile verification - fetch HTML directly
      return {
        profile: {
          display: username,
          uri: `https://news.ycombinator.com/user?id=${username}`,
        },
        proof: {
          request: {
            uri,
            fetcher: "http",
            format: "html",
            options: {
              headers: {
                "User-Agent": "keytrace-runner/1.0 (identity verification bot)",
              },
            },
          },
          target: [
            // Check the about field in the user profile: <tr><td valign="top">about:</td><td>content</td></tr>
            {
              css: 'tr:has(td:contains("about:")) td:last-child',
              relation: "contains",
              format: "text",
            },
          ],
        },
      };
    } else {
      // Item (comment/post) verification - fetch HTML directly
      return {
        profile: {
          display: "Hacker News",
          uri: "https://news.ycombinator.com",
        },
        proof: {
          request: {
            uri,
            fetcher: "http",
            format: "html",
            options: {
              headers: {
                "User-Agent": "keytrace-runner/1.0 (identity verification bot)",
              },
            },
          },
          target: [
            // Check comment/post text: <div class="commtext"> or <div class="toptext">
            {
              css: ".commtext, .toptext",
              relation: "contains",
              format: "text",
            },
            // Also check story title: <span class="titleline"> or look for title in athing row
            {
              css: "span.titleline a, tr.athing td.title a",
              relation: "contains",
              format: "text",
            },
          ],
        },
      };
    }
  },

  postprocess(data, match) {
    const [, , , username] = match;
    const isUserProfile = username !== undefined;

    // Data is raw HTML when using format: "html"
    const html = data as string;

    // Use cheerio to extract username from HTML
    // For profiles: already have username from URL
    // For items: extract from <a class="hnuser">
    if (isUserProfile) {
      return {
        subject: username,
        displayName: username,
        profileUrl: `https://news.ycombinator.com/user?id=${username}`,
        avatarUrl: undefined,
      };
    } else {
      // Extract username from item page using cheerio
      const $ = cheerio.load(html);
      const itemUsername = $("a.hnuser").first().text().trim() || "unknown";

      return {
        subject: itemUsername,
        displayName: itemUsername,
        profileUrl: itemUsername !== "unknown" ? `https://news.ycombinator.com/user?id=${itemUsername}` : undefined,
        avatarUrl: undefined,
      };
    }
  },

  getProofText(did) {
    return `I'm linking my keytrace.dev: ${did}`;
  },

  getProofLocation() {
    return `Add your DID to your Hacker News profile's about field, or create a post/comment containing it`;
  },

  tests: [
    // User profile URLs
    { uri: "https://news.ycombinator.com/user?id=alice", shouldMatch: true },
    { uri: "https://news.ycombinator.com/user?id=bob123", shouldMatch: true },
    { uri: "https://news.ycombinator.com/user?id=user_name", shouldMatch: true },
    { uri: "https://news.ycombinator.com/user?id=user-name", shouldMatch: true },
    { uri: "https://old.ycombinator.com/user?id=alice", shouldMatch: true },
    // Item URLs (comments/posts)
    { uri: "https://news.ycombinator.com/item?id=12345678", shouldMatch: true },
    { uri: "https://news.ycombinator.com/item?id=1", shouldMatch: true },
    { uri: "https://news.ycombinator.com/item?id=99999999", shouldMatch: true },
    { uri: "https://old.ycombinator.com/item?id=12345678", shouldMatch: true },
    // Should NOT match other HN URLs
    { uri: "https://news.ycombinator.com/", shouldMatch: false },
    { uri: "https://news.ycombinator.com/newest", shouldMatch: false },
    { uri: "https://news.ycombinator.com/submitted?id=alice", shouldMatch: false },
    // Should NOT match without id parameter
    { uri: "https://news.ycombinator.com/user", shouldMatch: false },
    { uri: "https://news.ycombinator.com/user?", shouldMatch: false },
    { uri: "https://news.ycombinator.com/user?id=", shouldMatch: false },
    { uri: "https://news.ycombinator.com/item", shouldMatch: false },
    { uri: "https://news.ycombinator.com/item?", shouldMatch: false },
    // Should NOT match with extra parameters
    { uri: "https://news.ycombinator.com/user?id=alice&foo=bar", shouldMatch: false },
    { uri: "https://news.ycombinator.com/item?id=123&foo=bar", shouldMatch: false },
    // Wrong domain
    { uri: "https://reddit.com/user?id=alice", shouldMatch: false },
    { uri: "https://example.com/item?id=123", shouldMatch: false },
  ],
};

export default hackernews;
