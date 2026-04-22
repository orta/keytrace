import { describe, it, expect, vi, beforeEach } from "vitest";
import steam from "../../src/serviceProviders/steam.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

function buildXml(fields: {
  steamID64?: string;
  steamID?: string;
  avatarFull?: string;
  customURL?: string;
  summary?: string;
  realname?: string;
  privacyState?: string;
}): string {
  const cdata = (tag: string, value?: string) =>
    value === undefined ? "" : `<${tag}><![CDATA[${value}]]></${tag}>`;
  const plain = (tag: string, value?: string) =>
    value === undefined ? "" : `<${tag}>${value}</${tag}>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><profile>
    ${plain("steamID64", fields.steamID64 ?? "76561197960287930")}
    ${cdata("steamID", fields.steamID ?? "Alice")}
    ${plain("privacyState", fields.privacyState ?? "public")}
    ${cdata("avatarFull", fields.avatarFull ?? "https://avatars.steamstatic.com/x_full.jpg")}
    ${cdata("customURL", fields.customURL ?? "")}
    ${cdata("realname", fields.realname ?? "")}
    ${cdata("summary", fields.summary ?? "")}
  </profile>`;
}

function mockFetchText(body: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(body),
    }),
  );
}

describe("steam service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of steam.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(steam.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("builds a text-format XML fetch for vanity URLs", () => {
      const uri = "https://steamcommunity.com/id/alice/";
      const match = uri.match(steam.reUri)!;
      const result = steam.processURI(uri, match);

      expect(result.profile.display).toBe("alice");
      expect(result.profile.uri).toBe("https://steamcommunity.com/id/alice");
      expect(result.proof.request.fetcher).toBe("http");
      expect(result.proof.request.format).toBe("text");
      expect(result.proof.request.uri).toBe("https://steamcommunity.com/id/alice/?xml=1");
    });

    it("builds a text-format XML fetch for /profiles/ URLs", () => {
      const uri = "https://steamcommunity.com/profiles/76561197960287930";
      const match = uri.match(steam.reUri)!;
      const result = steam.processURI(uri, match);

      expect(result.profile.uri).toBe("https://steamcommunity.com/profiles/76561197960287930");
      expect(result.proof.request.uri).toBe("https://steamcommunity.com/profiles/76561197960287930/?xml=1");
    });

    it("matches against the full XML response as text", () => {
      const uri = "https://steamcommunity.com/id/alice";
      const match = uri.match(steam.reUri)!;
      const result = steam.processURI(uri, match);

      expect(result.proof.target).toHaveLength(1);
      expect(result.proof.target[0].css).toBeUndefined();
      expect(result.proof.target[0].path).toBeUndefined();
      expect(result.proof.target[0].relation).toBe("contains");
    });

    it("strips extra trailing path segments before fetching XML", () => {
      const uri = "https://steamcommunity.com/id/alice/edit/info";
      const match = uri.match(steam.reUri)!;
      const result = steam.processURI(uri, match);

      expect(result.proof.request.uri).toBe("https://steamcommunity.com/id/alice/?xml=1");
    });
  });

  describe("postprocess", () => {
    it("uses SteamID64 as subject & for profileUrl, and captures the customUrl", () => {
      const uri = "https://steamcommunity.com/id/alice";
      const match = uri.match(steam.reUri)!;
      const xml = buildXml({
        steamID64: "76561197960287930",
        steamID: "Alice",
        avatarFull: "https://avatars.steamstatic.com/abc_full.jpg",
        customURL: "alice",
      });

      const result = steam.postprocess!(xml, match);

      // Always uses the steamID64 as the subject
      expect(result.subject).toBe("76561197960287930");
      expect(result.displayName).toBe("Alice");
      expect(result.avatarUrl).toBe("https://avatars.steamstatic.com/abc_full.jpg");
      // profileUrl always points at the canonical URL
      expect(result.profileUrl).toBe("https://steamcommunity.com/profiles/76561197960287930");
    });

    it("refuses to attest when the XML has no SteamID64", () => {
      const uri = "https://steamcommunity.com/id/alice";
      const match = uri.match(steam.reUri)!;
      const xml = `<?xml version="1.0"?><profile><steamID><![CDATA[Alice]]></steamID><customURL><![CDATA[alice]]></customURL></profile>`;

      expect(() => steam.postprocess!(xml, match)).toThrow(/steamID64/);
    });

    it("refuses to attest when <steamID64> is empty", () => {
      const uri = "https://steamcommunity.com/id/alice";
      const match = uri.match(steam.reUri)!;
      const xml = `<?xml version="1.0"?><profile><steamID64></steamID64><steamID><![CDATA[Alice]]></steamID></profile>`;

      expect(() => steam.postprocess!(xml, match)).toThrow(/steamID64/);
    });

    it("refuses to attest when <steamID64> is not a valid individual-account ID", () => {
      const uri = "https://steamcommunity.com/id/alice";
      const match = uri.match(steam.reUri)!;

      // Wrong prefix (not in the 7656… individual range — e.g. a group ID)
      const wrongPrefix = buildXml({ steamID64: "12345678901234567", steamID: "Alice" });
      expect(() => steam.postprocess!(wrongPrefix, match)).toThrow(/steamID64/);

      // Wrong length
      const tooShort = buildXml({ steamID64: "7656119796028793", steamID: "Alice" });
      expect(() => steam.postprocess!(tooShort, match)).toThrow(/steamID64/);

      // Non-digit garbage
      const garbage = buildXml({ steamID64: "not-a-steam-id", steamID: "Alice" });
      expect(() => steam.postprocess!(garbage, match)).toThrow(/steamID64/);
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    const did = "did:plc:abcdefghijklmnopqrst2345";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("verifies a profile whose Summary contains the DID", async () => {
      mockFetchText(
        buildXml({
          steamID64: "76561197994000231",
          steamID: "Alice",
          summary: `Verifying: ${did}`,
        }),
      );

      const claim = createClaim("https://steamcommunity.com/id/alice", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("76561197994000231");
      expect(result.identity?.displayName).toBe("Alice");
      expect(result.identity?.profileUrl).toBe("https://steamcommunity.com/profiles/76561197994000231");
      expect(result.identity?.avatarUrl).toBe("https://avatars.steamstatic.com/x_full.jpg");
      expect(result.proofDetails?.fetchUrl).toBe("https://steamcommunity.com/id/alice/?xml=1");
    });

    it("fails when the DID is absent from the XML response", async () => {
      mockFetchText(
        buildXml({
          steamID64: "76561197994000231",
          steamID: "Alice",
          summary: 'No DID here',
        }),
      );

      const claim = createClaim("https://steamcommunity.com/id/alice", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });
  });

  describe("getRecommendations", () => {
    it("flags non-public privacy states", () => {
      const xml = buildXml({ privacyState: "friendsonly" });
      const match = "https://steamcommunity.com/id/alice".match(steam.reUri)!;
      const recs = steam.getRecommendations!(xml, match);
      expect(recs.join(" ")).toMatch(/friendsonly/);
      expect(recs.join(" ")).toMatch(/Public/);
    });

    it("reports an empty Summary", () => {
      const xml = buildXml({ privacyState: "public", summary: "" });
      const match = "https://steamcommunity.com/id/alice".match(steam.reUri)!;
      const recs = steam.getRecommendations!(xml, match);
      expect(recs.join(" ")).toMatch(/Summary is empty/);
    });

    it("echoes the current Summary when present but without the DID", () => {
      const xml = buildXml({ summary: "A summary without a DID" });
      const match = "https://steamcommunity.com/id/alice".match(steam.reUri)!;
      const recs = steam.getRecommendations!(xml, match);
      expect(recs.join(" ")).toContain("A summary without a DID");
    });

    it("surfaces Steam's XML error responses", () => {
      const xml = `<?xml version="1.0"?><response><error><![CDATA[The specified profile could not be found.]]></error></response>`;
      const match = "https://steamcommunity.com/id/alice".match(steam.reUri)!;
      const recs = steam.getRecommendations!(xml, match);
      expect(recs.join(" ")).toContain("could not be found");
    });
  });
});
