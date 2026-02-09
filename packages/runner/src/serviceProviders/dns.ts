import type { ServiceProvider } from "./types.js";

/**
 * DNS TXT record service provider
 *
 * Users prove domain ownership by adding a TXT record containing their DID.
 * The claim URI format is: dns:example.com
 */
const dns: ServiceProvider = {
  id: "dns",
  name: "DNS",
  homepage: "",

  // Match dns:domain.tld URIs (must contain at least one dot)
  reUri: /^dns:([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+)$/,

  isAmbiguous: false,

  processURI(uri, match) {
    const [, domain] = match;

    return {
      profile: {
        display: domain,
        uri: `https://${domain}`,
        qrcode: false,
      },
      proof: {
        request: {
          uri: domain,
          fetcher: "dns",
          format: "json",
        },
        target: [
          // Look for DID in any TXT record
          { path: ["records", "txt"], relation: "contains", format: "text" },
        ],
      },
    };
  },

  getProofText(did) {
    return `keytrace-verification=${did}`;
  },

  tests: [
    { uri: "dns:example.com", shouldMatch: true },
    { uri: "dns:sub.example.com", shouldMatch: true },
    { uri: "dns:a.b.c.example.com", shouldMatch: true },
    { uri: "dns:example", shouldMatch: false },
    { uri: "dns:-invalid.com", shouldMatch: false },
    { uri: "https://example.com", shouldMatch: false },
  ],
};

export default dns;
