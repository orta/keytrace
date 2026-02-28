import { describe, it, expect, vi, beforeEach } from "vitest";
import reddit from "../../src/serviceProviders/reddit.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

describe("reddit service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of reddit.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(reddit.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("extracts subreddit and post ID from subreddit post URL", () => {
      const uri = "https://www.reddit.com/r/test/comments/abc123/my_post/";
      const match = uri.match(reddit.reUri)!;
      const result = reddit.processURI(uri, match);

      expect(result.profile.display).toBe("r/test");
      expect(result.profile.uri).toBe("https://www.reddit.com/r/test");
      expect(result.proof.request.fetcher).toBe("http");
      expect(result.proof.request.uri).toContain(".json");
      expect(result.proof.request.format).toBe("json");
      expect(result.proof.request.options?.headers?.["User-Agent"]).toContain("keytrace-runner");
    });

    it("extracts username and post ID from user post URL", () => {
      const uri = "https://www.reddit.com/user/alice/comments/xyz789/verification/";
      const match = uri.match(reddit.reUri)!;
      const result = reddit.processURI(uri, match);

      expect(result.profile.display).toBe("u/alice");
      expect(result.profile.uri).toBe("https://www.reddit.com/user/alice");
      expect(result.proof.request.uri).toContain("alice/comments/xyz789");
      expect(result.proof.request.uri).toContain(".json");
    });

    it("handles old.reddit.com URLs", () => {
      const uri = "https://old.reddit.com/r/test/comments/abc123/post/";
      const match = uri.match(reddit.reUri)!;
      const result = reddit.processURI(uri, match);

      expect(result.proof.request.uri).toContain(".json");
      expect(result.profile.display).toBe("r/test");
    });

    it("sets proof targets to selftext and title", () => {
      const uri = "https://www.reddit.com/r/test/comments/abc123/post/";
      const match = uri.match(reddit.reUri)!;
      const result = reddit.processURI(uri, match);

      expect(result.proof.target).toHaveLength(2);
      expect(result.proof.target[0].path).toContain("selftext");
      expect(result.proof.target[0].relation).toBe("contains");
      expect(result.proof.target[1].path).toContain("title");
    });
  });

  describe("postprocess", () => {
    it("extracts author and subreddit from Reddit JSON response", () => {
      const uri = "https://www.reddit.com/r/test/comments/abc123/post/";
      const match = uri.match(reddit.reUri)!;

      const jsonData = [
        {
          data: {
            children: [
              {
                data: {
                  author: "alice",
                  subreddit: "test",
                  title: "My verification post",
                  selftext: "Linking my keytrace.dev - did:plc:test123",
                  url: "https://www.reddit.com/r/test/comments/abc123/post/",
                },
              },
            ],
          },
        },
      ];

      const result = reddit.postprocess!(jsonData, match);

      expect(result.subject).toBe("alice");
      expect(result.displayName).toBe("u/alice");
      expect(result.profileUrl).toBe("https://www.reddit.com/user/alice");
    });

    it("handles non-array response format", () => {
      const uri = "https://www.reddit.com/r/test/comments/abc123/post/";
      const match = uri.match(reddit.reUri)!;

      const jsonData = {
        data: {
          children: [
            {
              data: {
                author: "bob",
                subreddit: "keytrace",
                title: "Verification",
                selftext: "My DID verification",
              },
            },
          ],
        },
      };

      const result = reddit.postprocess!(jsonData, match);

      expect(result.subject).toBe("bob");
      expect(result.displayName).toBe("u/bob");
      expect(result.profileUrl).toBe("https://www.reddit.com/user/bob");
    });

    it("falls back to unknown when no author available", () => {
      const uri = "https://www.reddit.com/r/test/comments/abc123/post/";
      const match = uri.match(reddit.reUri)!;

      const jsonData = [
        {
          data: {
            children: [
              {
                data: {
                  title: "Some post",
                },
              },
            ],
          },
        },
      ];

      const result = reddit.postprocess!(jsonData, match);
      expect(result.subject).toBe("unknown");
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    // Valid did:plc uses base32 alphabet (a-z, 2-7), exactly 24 chars
    const did = "did:plc:abcdefghijklmnopqrst2345";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    function mockFetchJson(
      selftext: string,
      author: string = "alice",
      title: string = "Verification post",
    ) {
      const jsonResponse = [
        {
          data: {
            children: [
              {
                data: {
                  author,
                  subreddit: "test",
                  title,
                  selftext,
                  url: "https://www.reddit.com/r/test/comments/abc123/post/",
                },
              },
            ],
          },
        },
      ];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(jsonResponse),
        }),
      );
    }

    it("verifies a Reddit post containing the DID in selftext", async () => {
      mockFetchJson(`Linking my keytrace.dev - ${did}`, "alice");

      const claim = createClaim("https://www.reddit.com/r/test/comments/abc123/post/", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("alice");
      expect(result.identity?.displayName).toBe("u/alice");
      expect(result.identity?.profileUrl).toBe("https://www.reddit.com/user/alice");
    });

    it("verifies a Reddit post containing the DID in title", async () => {
      mockFetchJson("Regular post text", "bob", `Verifying my identity: ${did}`);

      const claim = createClaim("https://www.reddit.com/r/test/comments/xyz789/verify/", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("bob");
    });

    it("fails when post does not contain the DID", async () => {
      mockFetchJson("Just a regular Reddit post", "alice", "Random title");

      const claim = createClaim("https://www.reddit.com/r/test/comments/abc123/post/", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });

    it("verifies user profile post", async () => {
      mockFetchJson(`My verification: ${did}`, "charlie");

      const claim = createClaim(
        "https://www.reddit.com/user/charlie/comments/def456/verify/",
        did,
      );
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("charlie");
      expect(result.identity?.profileUrl).toBe("https://www.reddit.com/user/charlie");
    });
  });
});
