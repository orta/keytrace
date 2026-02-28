import { describe, it, expect, vi, beforeEach } from "vitest";
import linkedin from "../../src/serviceProviders/linkedin.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

describe("linkedin service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of linkedin.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(linkedin.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("extracts username from LinkedIn post URL", () => {
      const uri = "https://www.linkedin.com/posts/ortatherox_keytrace-you-be-you-everywhere-share-7433426718113312769-vxsa";
      const match = uri.match(linkedin.reUri)!;
      const result = linkedin.processURI(uri, match);

      expect(result.profile.display).toBe("ortatherox");
      expect(result.profile.uri).toBe("https://www.linkedin.com/in/ortatherox");
      expect(result.proof.request.fetcher).toBe("http");
      expect(result.proof.request.uri).toBe(uri.split('?')[0]);
      expect(result.proof.request.format).toBe("json-ld");
      expect(result.proof.request.options?.headers?.["User-Agent"]).toBe("Mozilla/5.0 (compatible; KeytraceBot/1.0)");
    });

    it("removes query parameters from proof request URI", () => {
      const uri = "https://www.linkedin.com/posts/alice_post-activity-123-abc?utm_source=share&utm_medium=member_desktop";
      const match = uri.match(linkedin.reUri)!;
      const result = linkedin.processURI(uri, match);

      expect(result.proof.request.uri).toBe("https://www.linkedin.com/posts/alice_post-activity-123-abc");
    });

    it("sets proof targets to articleBody, text, and headline", () => {
      const uri = "https://www.linkedin.com/posts/alice_post-activity-123-abc";
      const match = uri.match(linkedin.reUri)!;
      const result = linkedin.processURI(uri, match);

      expect(result.proof.target).toHaveLength(3);
      expect(result.proof.target[0].path).toEqual(["articleBody"]);
      expect(result.proof.target[0].relation).toBe("contains");
      expect(result.proof.target[1].path).toEqual(["text"]);
      expect(result.proof.target[2].path).toEqual(["headline"]);
    });
  });

  describe("postprocess", () => {
    it("extracts author metadata from JSON-LD", () => {
      const uri = "https://www.linkedin.com/posts/ortatherox_keytrace-activity-123-abc";
      const match = uri.match(linkedin.reUri)!;

      const jsonLd = {
        "@context": "http://schema.org",
        "@type": "SocialMediaPosting",
        "@id": "https://www.linkedin.com/posts/ortatherox_keytrace-activity-123-abc",
        datePublished: "2026-02-28T08:23:56.097Z",
        headline: "Linking my http://keytrace.dev - did:plc:t732otzqvkch7zz5d37537ry",
        articleBody: "Linking my http://keytrace.dev - did:plc:t732otzqvkch7zz5d37537ry",
        text: "Keytrace - You be you, everywhere.",
        author: {
          name: "Orta Therox",
          url: "https://uk.linkedin.com/in/ortatherox",
          image: {
            url: "https://media.licdn.com/dms/image/v2/C4E03AQFMgLS6xlTYQA/profile-displayphoto-shrink_200_200/0/1517705540933",
          },
          "@type": "Person",
        },
      };

      const result = linkedin.postprocess!(jsonLd, match);

      expect(result.subject).toBe("ortatherox");
      expect(result.displayName).toBe("Orta Therox");
      expect(result.profileUrl).toBe("https://www.linkedin.com/in/ortatherox");
      expect(result.avatarUrl).toBe("https://media.licdn.com/dms/image/v2/C4E03AQFMgLS6xlTYQA/profile-displayphoto-shrink_200_200/0/1517705540933");
    });

    it("falls back to URL username when JSON-LD data is absent", () => {
      const uri = "https://www.linkedin.com/posts/fallback_user_post-activity-111-xyz";
      const match = uri.match(linkedin.reUri)!;

      const result = linkedin.postprocess!({}, match);
      expect(result.subject).toBe("fallback_user");
      expect(result.profileUrl).toBe("https://www.linkedin.com/in/fallback_user");
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    // Valid did:plc uses base32 alphabet (a-z, 2-7), exactly 24 chars
    const did = "did:plc:abcdefghijklmnopqrst2345";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    function mockFetchHtml(articleBody: string) {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">
    {
      "@context": "http://schema.org",
      "@type": "SocialMediaPosting",
      "datePublished": "2026-02-28T08:23:56.097Z",
      "headline": "${articleBody}",
      "articleBody": "${articleBody}",
      "text": "LinkedIn Post",
      "author": {
        "name": "Alice Smith",
        "url": "https://www.linkedin.com/in/alice",
        "image": {
          "url": "https://media.licdn.com/profile.jpg"
        },
        "@type": "Person"
      }
    }
  </script>
</head>
<body>
  <p>${articleBody}</p>
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

    it("verifies a LinkedIn post containing the DID", async () => {
      mockFetchHtml(`Linking my keytrace.dev - ${did}`);

      const claim = createClaim("https://www.linkedin.com/posts/alice_post-activity-123-abc", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("alice");
      expect(result.identity?.displayName).toBe("Alice Smith");
    });

    it("fails when post does not contain the DID", async () => {
      mockFetchHtml("Just a regular LinkedIn post about work");

      const claim = createClaim("https://www.linkedin.com/posts/alice_post-activity-123-abc", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });
  });
});
