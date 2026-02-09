import type { Recipe } from "../types.js";

/**
 * Built-in recipe: GitHub Account verification via public Gist.
 *
 * The user creates a public gist named keytrace.json containing
 * their claim ID and DID, then provides the gist URL for verification.
 */
export const githubGistRecipe: Recipe = {
  $type: "dev.keytrace.recipe",
  type: "github-gist",
  version: 1,
  displayName: "GitHub Account (via Gist)",
  params: [
    {
      key: "gistUrl",
      label: "Gist URL",
      type: "url",
      placeholder: "https://gist.github.com/octocat/abc123...",
      pattern: "^https://gist\\.github\\.com/([^/]+)/([a-f0-9]+)$",
      extractFrom: "^https://gist\\.github\\.com/([^/]+)/",
    },
  ],
  instructions: {
    steps: [
      "Go to https://gist.github.com",
      "Create a new public gist",
      "Name the file `keytrace.json`",
      "Paste the verification content below into the file",
      "Save the gist and paste the URL below",
    ],
    proofTemplate: '{\n  "keytrace": "{claimId}",\n  "did": "{did}"\n}',
    proofLocation: "Public gist with keytrace.json",
  },
  verification: {
    steps: [
      {
        action: "http-get",
        url: "{gistUrl}/raw/keytrace.json",
      },
      {
        action: "json-path",
        selector: "$.keytrace",
        expect: "equals:{claimId}",
      },
      {
        action: "json-path",
        selector: "$.did",
        expect: "equals:{did}",
      },
    ],
  },
};
