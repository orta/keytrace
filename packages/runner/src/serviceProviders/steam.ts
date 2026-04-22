import type { ServiceProvider } from "./types.js";

// 17-digit SteamID64 in the individual-account range (starts with 7656).
// Matches the /profiles/ segment of reUri; reused to validate <steamID64>
// values returned by the Steam XML endpoint.
const STEAM_ID_64_RE = /^7656\d{13}$/;

/**
 * Steam service provider
 *
 * Users prove ownership of their Steam account by placing their DID
 * in the profile "Summary" field (Edit Profile → General → Summary).
 *
 * Verification uses Steam's public profile XML endpoint
 * (https://steamcommunity.com/id/{vanity}/?xml=1 or /profiles/{steamID64}/?xml=1).
 * Unlike the rendered profile page — where the summary is injected client-side
 * by JavaScript and therefore not in the fetched HTML — the XML endpoint
 * server-renders every field (summary, personaname, avatar, etc.) with no
 * API key required.
 */
const steam: ServiceProvider = {
  id: "steam",
  name: "Steam",
  homepage: "https://steamcommunity.com",

  // Match vanity URLs: https://steamcommunity.com/id/{vanity}/
  // and profile URLs:  https://steamcommunity.com/profiles/{steamID64}/
  // Trailing path segments (e.g. /edit/info) are permitted, as its easy to copy them by mistake.
  // SteamID64 for individuals starts with 7656.
  reUri: /^https:\/\/steamcommunity\.com\/(?:id\/([a-zA-Z0-9_-]{3,32})|profiles\/(7656\d{13}))(\/.*)?$/,

  isAmbiguous: false,

  ui: {
    description: "Link via your Steam profile summary",
    icon: "steam",
    iconDisplay: "raw",
    inputLabel: "Steam Profile URL",
    inputPlaceholder: "https://steamcommunity.com/id/username",
    instructions: [
      "Open your [Steam profile](https://steamcommunity.com/my) and click **Edit Profile**",
      "Paste the verification content below into the **Summary** field",
      "Click **Save** — make sure your profile **Privacy Settings** are set to Public",
      "Copy your profile URL and paste it below",
    ],
    proofTemplate: "I'm linking my keytrace.dev: {did}",
  },

  processURI(_uri, match) {
    const [, vanity, steamId] = match;
    const identifier = vanity ?? steamId;
    const isVanity = Boolean(vanity);

    const profileUri = isVanity
      ? `https://steamcommunity.com/id/${identifier}`
      : `https://steamcommunity.com/profiles/${identifier}`;

    return {
      profile: {
        display: identifier,
        uri: profileUri,
      },
      proof: {
        request: {
          uri: `${profileUri}/?xml=1`,
          fetcher: "http",
          format: "text",
        },
        target: [
          // The XML response is scanned as a whole. The DID is unique enough
          // that we don't need to isolate <summary>; presence anywhere in
          // user-editable XML fields (summary/realname/location/headline)
          // counts as a valid proof.
          {
            relation: "contains",
            format: "text",
          },
        ],
      },
    };
  },

  postprocess(data, _match) {
    const xml = typeof data === "string" ? data : "";

    const personaName = extractXmlCData(xml, "steamID");
    const avatarUrl = extractXmlCData(xml, "avatarFull");
    const customURL = extractXmlCData(xml, "customURL");
    const steamID64 = extractXmlText(xml, "steamID64");
    if (!steamID64 || !STEAM_ID_64_RE.test(steamID64)) {
      throw new Error(
        `Steam profile XML did not include a valid <steamID64> (got ${JSON.stringify(steamID64 ?? "")}); cannot attest without a stable identifier`,
      );
    }

    // Always use the resolved steamID64 as the subject & profileURL
    // as the 'customUrl' ones (eg. https://steamcommunity.com/id/gabelogannewell)
    // can be changed & reused by other people.
    return {
      subject: steamID64,
      avatarUrl: avatarUrl || undefined,
      profileUrl: `https://steamcommunity.com/profiles/${steamID64}`,
      displayName: personaName || customURL || undefined,
    };
  },

  getProofText(did) {
    return `I'm linking my keytrace.dev: ${did}`;
  },

  getProofLocation() {
    return `Paste your DID into the Summary field of your Steam profile (Edit Profile → General → Summary)`;
  },

  getRecommendations(data) {
    const recommendations: string[] = [];
    if (typeof data !== "string") return recommendations;

    // Steam returns a tiny XML error doc (`<response><error>...</error></response>`)
    // when no profile is found.
    const error = extractXmlCData(data, "error") ?? extractXmlText(data, "error");
    if (error) {
      recommendations.push(`Steam returned an error: "${error}". Check that the profile URL is correct.`);
      return recommendations;
    }

    const privacy = extractXmlText(data, "privacyState");
    if (privacy && privacy !== "public") {
      recommendations.push(
        `This profile's privacy is set to **${privacy}**. Set it to **Public** so Keytrace can read the Summary.`,
      );
      return recommendations;
    }

    const summary = extractXmlCData(data, "summary") ?? "";
    if (!summary.trim()) {
      recommendations.push(
        "Your profile Summary is empty. Add your DID via Edit Profile → General → Summary.",
      );
    } else {
      recommendations.push(
        `Your current Summary: "${summary.slice(0, 160)}${summary.length > 160 ? "…" : ""}". Make sure it contains your full DID.`,
      );
    }
    return recommendations;
  },

  tests: [
    // Vanity URLs
    { uri: "https://steamcommunity.com/id/gabelogannewell", shouldMatch: true },
    { uri: "https://steamcommunity.com/id/gabelogannewell/", shouldMatch: true },
    { uri: "https://steamcommunity.com/id/gabelogannewell/info/edit", shouldMatch: true },
    { uri: "https://steamcommunity.com/id/alice_123", shouldMatch: true },
    { uri: "https://steamcommunity.com/id/user-name", shouldMatch: true },
    // Canonical profile URLs (SteamID64)
    { uri: "https://steamcommunity.com/profiles/76561197960287930", shouldMatch: true },
    { uri: "https://steamcommunity.com/profiles/76561197960287930/", shouldMatch: true },
    { uri: "https://steamcommunity.com/profiles/76561197960287930/info/edit", shouldMatch: true },
    // Vanity too short
    { uri: "https://steamcommunity.com/id/ab", shouldMatch: false },
    // Non-individual SteamID64 (wrong prefix)
    { uri: "https://steamcommunity.com/profiles/12345678901234567", shouldMatch: false },
    // Wrong length profile ID
    { uri: "https://steamcommunity.com/profiles/7656119796028793", shouldMatch: false },
    // Wrong domain
    { uri: "https://store.steampowered.com/id/gabelogannewell", shouldMatch: false },
    { uri: "https://steamcommunity.example.com/id/alice", shouldMatch: false },
    // Groups/market/etc are not profiles
    { uri: "https://steamcommunity.com/groups/valve", shouldMatch: false },
    { uri: "https://steamcommunity.com/market/", shouldMatch: false },
  ],
};

function extractXmlCData(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : undefined;
}

function extractXmlText(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = xml.match(re);
  return m ? m[1].trim() : undefined;
}

export default steam;
