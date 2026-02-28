import { describe, it, expect, vi, beforeEach } from "vitest";
import instagram from "../../src/serviceProviders/instagram.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

describe("instagram service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of instagram.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(instagram.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("extracts post ID from standard post URL", () => {
      const uri = "https://www.instagram.com/p/DVS8Tm6DWzP/";
      const match = uri.match(instagram.reUri)!;
      const result = instagram.processURI(uri, match);

      expect(result.profile.display).toBe("DVS8Tm6DWzP");
      expect(result.proof.request.fetcher).toBe("http");
      expect(result.proof.request.uri).toBe("https://www.instagram.com/p/DVS8Tm6DWzP/");
      expect(result.proof.request.format).toBe("og-meta");
      expect(result.proof.request.options?.headers?.["User-Agent"]).toContain("Mozilla");
    });

    it("extracts username and post ID from URL with username", () => {
      const uri = "https://www.instagram.com/orta/p/DVS8Tm6DWzP/";
      const match = uri.match(instagram.reUri)!;
      const result = instagram.processURI(uri, match);

      expect(result.profile.display).toBe("@orta");
      expect(result.profile.uri).toBe("https://www.instagram.com/orta/");
      expect(result.proof.request.uri).toBe("https://www.instagram.com/p/DVS8Tm6DWzP/");
    });

    it("sets proof targets to title and description", () => {
      const uri = "https://www.instagram.com/p/ABC123/";
      const match = uri.match(instagram.reUri)!;
      const result = instagram.processURI(uri, match);

      expect(result.proof.target).toHaveLength(2);
      expect(result.proof.target[0].path).toEqual(["title"]);
      expect(result.proof.target[0].relation).toBe("contains");
      expect(result.proof.target[1].path).toEqual(["description"]);
    });
  });

  describe("postprocess", () => {
    it("extracts username and display name from Open Graph data", () => {
      const uri = "https://www.instagram.com/orta/p/DVS8Tm6DWzP/";
      const match = uri.match(instagram.reUri)!;

      const ogData = {
        type: "article",
        site_name: "Instagram",
        title: "Orta Therox on Instagram: \"Linking my keytrace.dev - did:plc:test123\"",
        description: "0 likes, 0 comments - orta on February 28, 2026: \"Linking my keytrace.dev - did:plc:test123\"",
        url: "https://www.instagram.com/orta/p/DVS8Tm6DWzP/",
        image: "https://scontent.cdninstagram.com/example.jpg",
        username: "orta",
      };

      const result = instagram.postprocess!(ogData, match);

      expect(result.subject).toBe("orta");
      expect(result.displayName).toBe("Orta Therox");
      expect(result.profileUrl).toBe("https://www.instagram.com/orta/");
      expect(result.avatarUrl).toBe("https://scontent.cdninstagram.com/example.jpg");
    });

    it("extracts username from URL when not in og data", () => {
      const uri = "https://www.instagram.com/alice/p/ABC123/";
      const match = uri.match(instagram.reUri)!;

      const ogData = {
        title: "Alice Smith on Instagram: \"Test post\"",
        description: "5 likes - alice on January 1, 2026: \"Test post\"",
      };

      const result = instagram.postprocess!(ogData, match);
      expect(result.subject).toBe("alice");
    });

    it("falls back to unknown when no username available", () => {
      const uri = "https://www.instagram.com/p/ABC123/";
      const match = uri.match(instagram.reUri)!;

      const result = instagram.postprocess!({}, match);
      expect(result.subject).toBe("unknown");
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    // Valid did:plc uses base32 alphabet (a-z, 2-7), exactly 24 chars
    const did = "did:plc:abcdefghijklmnopqrst2345";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    function mockFetchHtml(caption: string, username: string = "alice") {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Instagram" />
  <meta property="og:title" content="${username} on Instagram: &quot;${caption}&quot;" />
  <meta property="og:description" content="0 likes, 0 comments - ${username} on February 28, 2026: &quot;${caption}&quot;" />
  <meta property="og:url" content="https://www.instagram.com/${username}/p/ABC123/" />
  <meta property="og:image" content="https://scontent.cdninstagram.com/test.jpg" />
</head>
<body>
  <p>${caption}</p>
</body>
</html>
      `;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(html),
        }),
      );
    }

    it("verifies an Instagram post containing the DID", async () => {
      mockFetchHtml(`Linking my keytrace.dev - ${did}`, "alice");

      const claim = createClaim("https://www.instagram.com/p/ABC123/", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("alice");
    });

    it("fails when post does not contain the DID", async () => {
      mockFetchHtml("Just a regular Instagram post", "alice");

      const claim = createClaim("https://www.instagram.com/p/ABC123/", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });

    it("verifies with username in URL", async () => {
      mockFetchHtml(`Verifying: ${did}`, "bob");

      const claim = createClaim("https://www.instagram.com/bob/p/XYZ789/", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("bob");
      expect(result.identity?.profileUrl).toBe("https://www.instagram.com/bob/");
    });
  });
});
