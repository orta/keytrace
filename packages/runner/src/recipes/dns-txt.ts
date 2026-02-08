import type { Recipe } from "../types.js";

/**
 * Built-in recipe: Domain verification via DNS TXT record.
 *
 * The user adds a TXT record to their domain containing their DID,
 * then provides the domain name for verification.
 */
export const dnsTxtRecipe: Recipe = {
  $type: "dev.keytrace.recipe",
  type: "dns",
  version: 1,
  displayName: "Domain (via DNS TXT)",
  params: [
    {
      key: "domain",
      label: "Domain name",
      type: "domain",
      placeholder: "example.com",
      pattern:
        "^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$",
    },
  ],
  instructions: {
    steps: [
      "Log into your domain's DNS management panel",
      "Add a new TXT record to the root domain (or _keytrace subdomain)",
      "Set the value to the verification text below",
      "Wait for DNS propagation (may take a few minutes)",
    ],
    proofTemplate: "keytrace-verification={did}",
    proofLocation: "DNS TXT record on your domain",
  },
  verification: {
    steps: [
      {
        action: "dns-txt",
        url: "{domain}",
      },
      {
        action: "regex-match",
        pattern: "keytrace-verification=({did})",
        expect: "equals:{did}",
      },
    ],
  },
};
