import type { ServiceProvider } from "./types.js";

/**
 * itch.io service provider
 *
 * Users prove ownership of their itch.io account by setting their
 * ATProto DID in the Bluesky DID Settings at itch.io/user/settings/bluesky.
 * The DID is then served at https://username.itch.io/.well-known/atproto-did
 */
const itchio: ServiceProvider = {
  id: "itchio",
  name: "itch.io",
  homepage: "https://itch.io",

  // Match https://username.itch.io URLs
  reUri: /^https:\/\/([a-zA-Z0-9][a-zA-Z0-9-]*)\.itch\.io\/?$/,

  isAmbiguous: false,

  ui: {
    description: "Link via your itch.io profile",
    icon: "itchio",
    iconDisplay: "raw",
    inputLabel: "itch.io Profile URL",
    inputPlaceholder: "https://username.itch.io",
    instructions: [
      "Go to your [itch.io Bluesky DID Settings](https://itch.io/user/settings/bluesky)",
      "Paste the verification content below into the **atproto_did** field",
      "Click **Save Changes**",
      "Enter your itch.io profile URL below and verify",
    ],
    proofTemplate: "{did}",
  },

  processURI(uri, match) {
    const [, username] = match;

    return {
      profile: {
        display: username,
        uri: `https://${username}.itch.io`,
      },
      proof: {
        request: {
          uri: `https://${username}.itch.io/.well-known/atproto-did`,
          fetcher: "http",
          format: "text",
        },
        target: [
          { relation: "contains", format: "text" },
        ],
      },
    };
  },

  getProofText(did) {
    return did;
  },

  getProofLocation(match) {
    return `Set your DID at https://itch.io/user/settings/bluesky`;
  },

  tests: [
    { uri: "https://orta.itch.io", shouldMatch: true },
    { uri: "https://orta.itch.io/", shouldMatch: true },
    { uri: "https://some-user.itch.io", shouldMatch: true },
    { uri: "https://user123.itch.io", shouldMatch: true },
    // Should NOT match game pages or other paths
    { uri: "https://orta.itch.io/my-game", shouldMatch: false },
    { uri: "https://itch.io", shouldMatch: false },
    { uri: "https://itch.io/profile/orta", shouldMatch: false },
    // Wrong domain
    { uri: "https://orta.example.com", shouldMatch: false },
  ],
};

export default itchio;
