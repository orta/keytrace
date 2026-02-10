import type { ServiceProvider } from "./types.js";

/**
 * DNS TXT record service provider
 *
 * Users prove domain ownership by adding a TXT record containing their DID.
 * The claim URI format is: dns:example.com
 */
const dns: ServiceProvider = {
  id: "dns",
  name: "Domain",
  homepage: "",

  // Match dns:domain.tld URIs (must contain at least one dot)
  reUri: /^dns:([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+)$/,

  isAmbiguous: false,

  ui: {
    description: "Link via DNS TXT record",
    icon: "globe",
    inputLabel: "Domain",
    inputPlaceholder: "example.com",
    instructions: [
      "Open your domain's DNS settings (usually in your registrar or hosting provider)",
      "Add a new **TXT record** at the root domain (or at `_keytrace.yourdomain.com`)",
      "Set the record value to the verification content below",
      "Save and wait for DNS propagation (may take a few minutes to an hour)",
      "Enter your domain below and verify",
    ],
    proofTemplate: "keytrace-verification={did}",
  },

  processURI(uri, match) {
    const [, domain] = match;

    return {
      profile: {
        display: domain,
        uri: `https://${domain}`,
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

  getProofLocation(match) {
    const [, domain] = match;
    return `Add a TXT record at the root of ${domain} (or at _keytrace.${domain})`;
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
