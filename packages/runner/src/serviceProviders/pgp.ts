import type { ServiceProvider } from "./types.js";

/**
 * PGP Key service provider
 *
 * Users prove ownership of a PGP key by clearsigning a proof message
 * containing their DID and fingerprint, then hosting it at a URL.
 * The claim URI format is: pgp:https://...
 *
 * Supported proof hosting:
 * - GitHub Gists (fetches via API)
 * - Tangled Strings (fetches raw content)
 * - Any other HTTPS URL (fetches as plain text)
 */
const pgp: ServiceProvider = {
  id: "pgp",
  name: "PGP Key",
  homepage: "https://www.openpgp.org",

  // Match pgp: prefixed URLs
  reUri: /^pgp:(https:\/\/.+)$/,

  isAmbiguous: false,

  ui: {
    description: "Prove ownership of a PGP key",
    icon: "shield",
    inputLabel: "Proof URL",
    inputPlaceholder: "https://gist.github.com/username/abc123...",
    instructions: [
      "Install [GPG tools](https://gist.github.com/jfrobbins/5c2dbceb81c33afc5b0bcbe0d3343692#1-installing-gpg)",
      "Enter your PGP fingerprint to set up the proof (run `gpg --fingerprint` to find it)",
      "Copy the proof text and save it to a file (e.g. `proof.txt`)",
      "Clearsign the file with your PGP key: `gpg --clearsign proof.txt`",
      "Host the signed output (`proof.txt.asc`) at a public URL — a [GitHub Gist](https://gist.github.com) or [Tangled String](https://tangled.org/strings/new) works well",
      "Paste the URL below",
    ],
    proofTemplate: "Verifying my PGP key on keytrace\n\ndid: {did}\nfingerprint: {fingerprint}",
    extraInputs: [
      {
        key: "fingerprint",
        label: "PGP Fingerprint",
        placeholder: "AB12 CD34 EF56 7890 1234  5678 9ABC DEF0 1234 5678",
        pattern: "^[A-Fa-f0-9 ]{16,}$",
        patternError: "Enter a valid PGP fingerprint (hex characters)",
      },
    ],
  },

  processURI(uri, match) {
    const [, proofUrl] = match;

    // Detect hosting platform to choose fetch strategy
    const gistMatch = proofUrl.match(/^https:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)\/?$/);
    const tangledMatch = proofUrl.match(/^https:\/\/tangled\.org\/strings\/([^/]+)\/([a-z0-9]+)\/?$/);

    if (gistMatch) {
      const [, , gistId] = gistMatch;
      return {
        profile: {
          display: "PGP Key",
          uri: proofUrl,
        },
        proof: {
          request: {
            uri: `https://api.github.com/gists/${gistId}`,
            fetcher: "http",
            format: "json",
            options: {
              headers: { Accept: "application/vnd.github.v3+json" },
            },
          },
          target: [{ path: ["files", "*", "content"], relation: "contains", format: "text" }],
        },
      };
    }

    if (tangledMatch) {
      const [, username, stringId] = tangledMatch;
      return {
        profile: {
          display: "PGP Key",
          uri: proofUrl,
        },
        proof: {
          request: {
            uri: `https://tangled.org/strings/${username}/${stringId}/raw`,
            fetcher: "http",
            format: "text",
          },
          target: [{ path: [], relation: "contains", format: "text" }],
        },
      };
    }

    // Generic URL: fetch as plain text
    return {
      profile: {
        display: "PGP Key",
        uri: proofUrl,
      },
      proof: {
        request: {
          uri: proofUrl,
          fetcher: "http",
          format: "text",
        },
        target: [{ path: [], relation: "contains", format: "text" }],
      },
    };
  },

  postprocess(data, match) {
    const [, proofUrl] = match;

    // Try to extract fingerprint from the proof text
    let text = "";
    if (typeof data === "string") {
      text = data;
    } else if (data && typeof data === "object") {
      // For gist JSON, search through file contents
      const gist = data as { files?: Record<string, { content?: string }>; owner?: { avatar_url?: string; login?: string } };
      if (gist.files) {
        for (const file of Object.values(gist.files)) {
          if (file.content) {
            text += file.content + "\n";
          }
        }
      }
    }

    const fpMatch = text.match(/fingerprint:\s*([A-Fa-f0-9 ]{16,})/);
    const fingerprint = fpMatch ? fpMatch[1].replace(/\s+/g, "").toLowerCase() : undefined;

    const result: {
      subject?: string;
      avatarUrl?: string;
      profileUrl?: string;
      displayName?: string;
    } = {
      subject: fingerprint,
      profileUrl: proofUrl,
      displayName: "PGP Key",
    };

    // Extract avatar from GitHub gists
    const gistMatch = proofUrl.match(/^https:\/\/gist\.github\.com\/([^/]+)\//);
    if (gistMatch && data && typeof data === "object") {
      const gist = data as { owner?: { avatar_url?: string; login?: string } };
      if (gist.owner?.avatar_url) {
        result.avatarUrl = gist.owner.avatar_url;
      }
    }

    // Extract username from Tangled strings
    const tangledMatch = proofUrl.match(/^https:\/\/tangled\.org\/strings\/([^/]+)\//);
    if (tangledMatch) {
      result.displayName = `PGP Key (${tangledMatch[1]})`;
    }

    return result;
  },

  getProofText(did) {
    return `Verifying my PGP key on keytrace\n\ndid: ${did}\nfingerprint: {fingerprint}`;
  },

  getProofLocation() {
    return "Host the clearsigned proof at a public URL (e.g. a GitHub Gist)";
  },

  tests: [
    { uri: "pgp:https://gist.github.com/alice/abc123def456", shouldMatch: true },
    { uri: "pgp:https://example.com/proof.txt", shouldMatch: true },
    { uri: "pgp:https://tangled.org/strings/alice/abc123", shouldMatch: true },
    { uri: "https://gist.github.com/alice/abc123", shouldMatch: false },
    { uri: "pgp:http://example.com/proof.txt", shouldMatch: false },
  ],
};

export default pgp;
