import { describe, it, expect } from "vitest";
import { Claim, ClaimStatus } from "../src/index.js";

// Valid test DIDs (did:plc requires 24 base32 chars [a-z2-7])
const VALID_DID_PLC = "did:plc:z72i7hdynmk6r22z27h6tvur";
const VALID_DID_WEB = "did:web:example.com";

describe("Claim", () => {
  describe("constructor", () => {
    it("should accept valid did:plc DID", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456", VALID_DID_PLC);
      expect(claim.did).toBe(VALID_DID_PLC);
      expect(claim.uri).toBe("https://gist.github.com/alice/abc123def456");
    });

    it("should accept did:web DIDs", () => {
      const claim = new Claim("dns:example.com", VALID_DID_WEB);
      expect(claim.did).toBe(VALID_DID_WEB);
    });

    it("should reject invalid DID", () => {
      expect(() => new Claim("https://gist.github.com/alice/abc123", "invalid")).toThrow(
        "Invalid DID format",
      );
    });

    it("should reject empty DID", () => {
      expect(() => new Claim("https://gist.github.com/alice/abc123", "")).toThrow(
        "Invalid DID format",
      );
    });

    it("should reject did: prefix without valid method", () => {
      expect(() => new Claim("dns:example.com", "did:foo:bar")).toThrow("Invalid DID format");
    });

    it("should reject did:plc with wrong length", () => {
      expect(() => new Claim("dns:example.com", "did:plc:tooshort")).toThrow("Invalid DID format");
    });
  });

  describe("match", () => {
    it("should match GitHub gist URI", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456", VALID_DID_PLC);
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
      expect(claim.matches).toHaveLength(1);
      expect(claim.matches[0].provider.id).toBe("github");
    });

    it("should match DNS URI", () => {
      const claim = new Claim("dns:example.com", VALID_DID_PLC);
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
      expect(claim.matches).toHaveLength(1);
      expect(claim.matches[0].provider.id).toBe("dns");
    });

    it("should match ActivityPub/Mastodon URI", () => {
      const claim = new Claim("https://mastodon.social/@alice", VALID_DID_PLC);
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
      expect(claim.matches).toHaveLength(1);
      expect(claim.matches[0].provider.id).toBe("activitypub");
    });

    it("should match Bluesky URI", () => {
      const claim = new Claim("https://bsky.app/profile/alice.bsky.social", VALID_DID_PLC);
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
      expect(claim.matches).toHaveLength(1);
      expect(claim.matches[0].provider.id).toBe("bsky");
    });

    it("should fail on unknown URI", () => {
      const claim = new Claim("https://unknown.site/alice", VALID_DID_PLC);
      claim.match();
      expect(claim.status).toBe(ClaimStatus.ERROR);
      expect(claim.errors).toHaveLength(1);
      expect(claim.errors[0]).toContain("No service provider matched");
    });

    it("should handle trailing slashes", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456/", VALID_DID_PLC);
      claim.match();
      expect(claim.status).toBe(ClaimStatus.MATCHED);
    });
  });

  describe("isAmbiguous", () => {
    it("should return false for GitHub (unambiguous)", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456", VALID_DID_PLC);
      claim.match();
      expect(claim.isAmbiguous()).toBe(false);
    });

    it("should return true for ActivityPub (ambiguous)", () => {
      const claim = new Claim("https://mastodon.social/@alice", VALID_DID_PLC);
      claim.match();
      expect(claim.isAmbiguous()).toBe(true);
    });
  });

  describe("toJSON", () => {
    it("should serialize claim to JSON", () => {
      const claim = new Claim("https://gist.github.com/alice/abc123def456", VALID_DID_PLC);
      claim.match();

      const json = claim.toJSON();
      expect(json).toEqual({
        uri: "https://gist.github.com/alice/abc123def456",
        did: VALID_DID_PLC,
        status: ClaimStatus.MATCHED,
        matches: [{ provider: "github", isAmbiguous: false }],
        errors: [],
      });
    });
  });

  describe("fromJSON", () => {
    it("should deserialize claim from JSON", () => {
      const claim = Claim.fromJSON({
        uri: "https://gist.github.com/alice/abc123def456",
        did: VALID_DID_PLC,
      });
      expect(claim.uri).toBe("https://gist.github.com/alice/abc123def456");
      expect(claim.did).toBe(VALID_DID_PLC);
      expect(claim.status).toBe(ClaimStatus.INIT);
    });
  });
});
