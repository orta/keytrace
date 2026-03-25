import type { ServiceProvider } from "./types.js";

/**
 * ORCiD service provider
 *
 * Users prove ownership of their ORCiD profile by adding a URL containing
 * their DID to the "Websites & Social Links" section of their public ORCiD
 * profile. Verification uses the ORCiD public API (no auth required).
 */
const orcid: ServiceProvider = {
  id: "orcid",
  name: "ORCiD",
  homepage: "https://orcid.org",

  // Match ORCiD profile URLs in two formats:
  //   https://orcid.org/0009-0004-2882-6258
  //   https://orcid.org/my-orcid?orcid=0009-0004-2882-6258
  // Last segment can end with X (check digit)
  reUri: /^https:\/\/orcid\.org\/(?:(\d{4}-\d{4}-\d{4}-\d{3}[\dX])\/?|my-orcid\?orcid=(\d{4}-\d{4}-\d{4}-\d{3}[\dX]))$/,

  isAmbiguous: false,

  ui: {
    description: "Link via your ORCiD researcher profile",
    icon: "orcid",
    inputLabel: "ORCiD Profile URL",
    inputPlaceholder: "https://orcid.org/0000-0000-0000-0000",
    instructions: [
      "Go to your **[ORCiD profile](https://orcid.org/my-orcid)**",
      "Under **Websites & Social Links**, add a new entry",
      "Choose what ever you want for the label (e.g. 'Bluesky: [username]')",
      "Paste the URL below as the website address",
      "Set the visibility to **Everyone** (public) and save",
      "Paste your ORCiD profile URL (e.g. `https://orcid.org/0000-0002-1825-0097`) below",
    ],
    proofTemplate: "https://bsky.app/profile/{did}",
  },

  processURI(uri, match) {
    const orcidId = match[1] ?? match[2];

    return {
      profile: {
        display: orcidId,
        uri: `https://orcid.org/${orcidId}`,
      },
      proof: {
        request: {
          uri: `https://pub.orcid.org/v3.0/${orcidId}/record`,
          fetcher: "http",
          format: "json",
          options: {
            headers: {
              Accept: "application/json",
              "User-Agent": "keytrace-runner/1.0",
            },
          },
        },
        target: [
          {
            // Check all researcher URL values for the DID
            path: ["person", "researcher-urls", "researcher-url", "*", "url", "value"],
            relation: "contains",
            format: "uri",
          },
        ],
      },
    };
  },

  postprocess(data, match) {
    const orcidId = match[1] ?? match[2];

    type OrcidRecord = {
      person?: {
        name?: {
          "given-names"?: { value?: string };
          "family-name"?: { value?: string };
          "credit-name"?: { value?: string };
        };
      };
    };

    const record = data as OrcidRecord;
    const nameObj = record?.person?.name;
    const creditName = nameObj?.["credit-name"]?.value;
    const givenNames = nameObj?.["given-names"]?.value;
    const familyName = nameObj?.["family-name"]?.value;

    const joinedName = [givenNames, familyName].filter(Boolean).join(" ") || undefined;
    const displayName = creditName ?? joinedName;

    return {
      subject: orcidId,
      profileUrl: `https://orcid.org/${orcidId}`,
      displayName,
    };
  },

  getProofText(did) {
    return `https://bsky.app/profile/${did}`;
  },

  getProofLocation() {
    return `Add this URL to your ORCiD "Websites & Social Links" section (visibility set to public)`;
  },

  getRecommendations(_data, match) {
    const orcidId = match[1] ?? match[2];
    return [
      `Make sure you have added a URL containing your DID to the "Websites & Social Links" section of your ORCiD profile at https://orcid.org/${orcidId}`,
      `Ensure the entry's visibility is set to "Everyone" (public) — private or trusted-parties entries are not visible via the public API`,
    ];
  },

  tests: [
    { uri: "https://orcid.org/0009-0004-2882-6258", shouldMatch: true },
    { uri: "https://orcid.org/0000-0001-2345-678X", shouldMatch: true },
    { uri: "https://orcid.org/0000-0002-1825-0097", shouldMatch: true },
    // Trailing slash allowed
    { uri: "https://orcid.org/0000-0002-1825-0097/", shouldMatch: true },
    // my-orcid query param format
    { uri: "https://orcid.org/my-orcid?orcid=0009-0004-2882-6258", shouldMatch: true },
    { uri: "https://orcid.org/my-orcid?orcid=0000-0001-2345-678X", shouldMatch: true },
    // Sandbox domain not supported
    { uri: "https://sandbox.orcid.org/0000-0002-1825-0097", shouldMatch: false },
    // Missing dashes
    { uri: "https://orcid.org/0000000218250097", shouldMatch: false },
    // Sub-page
    { uri: "https://orcid.org/0000-0002-1825-0097/works", shouldMatch: false },
    // Wrong domain
    { uri: "https://example.com/0000-0002-1825-0097", shouldMatch: false },
  ],
};

export default orcid;
