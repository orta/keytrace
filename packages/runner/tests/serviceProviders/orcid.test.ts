import { describe, it, expect, vi, beforeEach } from "vitest";
import orcid from "../../src/serviceProviders/orcid.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

describe("orcid service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of orcid.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(orcid.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("extracts ORCiD ID from profile URL", () => {
      const uri = "https://orcid.org/0009-0004-2882-6258";
      const match = uri.match(orcid.reUri)!;
      const result = orcid.processURI(uri, match);

      expect(result.profile.display).toBe("0009-0004-2882-6258");
      expect(result.profile.uri).toBe("https://orcid.org/0009-0004-2882-6258");
      expect(result.proof.request.fetcher).toBe("http");
      expect(result.proof.request.uri).toBe("https://pub.orcid.org/v3.0/0009-0004-2882-6258/record");
      expect(result.proof.request.format).toBe("json");
      expect(result.proof.request.options?.headers?.["Accept"]).toBe("application/json");
    });

    it("accepts ORCiD IDs ending in X", () => {
      const uri = "https://orcid.org/0000-0001-2345-678X";
      const match = uri.match(orcid.reUri)!;
      const result = orcid.processURI(uri, match);

      expect(result.profile.display).toBe("0000-0001-2345-678X");
      expect(result.proof.request.uri).toBe("https://pub.orcid.org/v3.0/0000-0001-2345-678X/record");
    });

    it("sets proof target to researcher URL values", () => {
      const uri = "https://orcid.org/0009-0004-2882-6258";
      const match = uri.match(orcid.reUri)!;
      const result = orcid.processURI(uri, match);

      expect(result.proof.target).toHaveLength(1);
      expect(result.proof.target[0].path).toEqual([
        "person",
        "researcher-urls",
        "researcher-url",
        "*",
        "url",
        "value",
      ]);
      expect(result.proof.target[0].relation).toBe("contains");
    });
  });

  describe("postprocess", () => {
    it("extracts ORCiD ID and display name from full record", () => {
      const uri = "https://orcid.org/0009-0004-2882-6258";
      const match = uri.match(orcid.reUri)!;

      const orcidRecord = {
        person: {
          name: {
            "given-names": { value: "Jane" },
            "family-name": { value: "Researcher" },
          },
          "researcher-urls": {
            "researcher-url": [
              {
                "url-name": "Bluesky",
                url: { value: "https://bsky.app/profile/did:plc:abcdefghijklmnopqrst2345" },
                visibility: "public",
              },
            ],
          },
        },
      };

      const result = orcid.postprocess!(orcidRecord, match);

      expect(result.subject).toBe("0009-0004-2882-6258");
      expect(result.profileUrl).toBe("https://orcid.org/0009-0004-2882-6258");
      expect(result.displayName).toBe("Jane Researcher");
    });

    it("prefers credit-name when available", () => {
      const uri = "https://orcid.org/0009-0004-2882-6258";
      const match = uri.match(orcid.reUri)!;

      const orcidRecord = {
        person: {
          name: {
            "given-names": { value: "Jane" },
            "family-name": { value: "Researcher" },
            "credit-name": { value: "J. Researcher" },
          },
        },
      };

      const result = orcid.postprocess!(orcidRecord, match);
      expect(result.displayName).toBe("J. Researcher");
    });

    it("handles missing name gracefully", () => {
      const uri = "https://orcid.org/0009-0004-2882-6258";
      const match = uri.match(orcid.reUri)!;

      const result = orcid.postprocess!({}, match);

      expect(result.subject).toBe("0009-0004-2882-6258");
      expect(result.profileUrl).toBe("https://orcid.org/0009-0004-2882-6258");
      expect(result.displayName).toBeUndefined();
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    const did = "did:plc:abcdefghijklmnopqrst2345";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    function mockFetch(researcherUrls: { value: string }[]) {
      const orcidRecord = {
        person: {
          name: {
            "given-names": { value: "Jane" },
            "family-name": { value: "Researcher" },
          },
          "researcher-urls": {
            "researcher-url": researcherUrls.map((u, i) => ({
              "url-name": "Bluesky",
              url: { value: u.value },
              visibility: "public",
              "put-code": i + 1,
            })),
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(orcidRecord),
        }),
      );
    }

    it("verifies when a researcher URL contains the DID", async () => {
      mockFetch([{ value: `https://bsky.app/profile/${did}` }]);

      const claim = createClaim("https://orcid.org/0009-0004-2882-6258", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("0009-0004-2882-6258");
      expect(result.identity?.displayName).toBe("Jane Researcher");
    });

    it("verifies when DID appears in any of multiple researcher URLs", async () => {
      mockFetch([
        { value: "https://example.com/my-profile" },
        { value: `https://bsky.app/profile/${did}` },
      ]);

      const claim = createClaim("https://orcid.org/0009-0004-2882-6258", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
    });

    it("fails when no researcher URL contains the DID", async () => {
      mockFetch([{ value: "https://example.com/my-profile" }]);

      const claim = createClaim("https://orcid.org/0009-0004-2882-6258", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });

    it("fails when researcher URLs list is empty", async () => {
      mockFetch([]);

      const claim = createClaim("https://orcid.org/0009-0004-2882-6258", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });
  });
});
