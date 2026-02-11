import type { Recipe } from "../types.js";

/**
 * Built-in recipe: Tangled Account verification via string.
 *
 * The user creates a string (Tangled's gist equivalent) containing
 * their DID, then provides the string URL for verification.
 * Raw content is fetched from {stringUrl}/raw.
 */
export const tangledRecipe: Recipe = {
  $type: "dev.keytrace.recipe",
  type: "tangled",
  version: 1,
  displayName: "Tangled Account (via String)",
  params: [
    {
      key: "stringUrl",
      label: "String URL",
      type: "url",
      placeholder: "https://tangled.org/strings/username/abc123...",
      pattern: "^https://tangled\\.org/strings/([^/]+)/([a-z0-9]+)/?$",
      extractFrom: "^https://tangled\\.org/strings/([^/]+)/",
    },
  ],
  instructions: {
    steps: [
      "Go to [tangled.org/strings](https://tangled.org/strings) and create a new string",
      "Name the file `keytrace.json`",
      "Paste the verification content below into the file",
      "Save the string and paste the URL below",
    ],
    proofTemplate: '{\n  "did": "{did}"\n}',
    proofLocation: "Public string on tangled.org",
  },
  verification: {
    steps: [
      {
        action: "http-get",
        url: "{stringUrl}/raw",
      },
      {
        action: "json-path",
        selector: "$.did",
        expect: "equals:{did}",
      },
    ],
  },
};
