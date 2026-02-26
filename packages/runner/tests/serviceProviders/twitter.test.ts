import { describe, it, expect, vi, beforeEach } from "vitest";
import twitter from "../../src/serviceProviders/twitter.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

describe("twitter service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of twitter.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(twitter.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("extracts username from twitter.com URL", () => {
      const uri = "https://twitter.com/alice/status/1234567890";
      const match = uri.match(twitter.reUri)!;
      const result = twitter.processURI(uri, match);

      expect(result.profile.display).toBe("@alice");
      expect(result.profile.uri).toBe("https://x.com/alice");
      expect(result.proof.request.fetcher).toBe("twitter");
      expect(result.proof.request.uri).toBe(uri);
      expect(result.proof.request.format).toBe("json");
    });

    it("extracts username from x.com URL", () => {
      const uri = "https://x.com/bob_dev/status/9876543210";
      const match = uri.match(twitter.reUri)!;
      const result = twitter.processURI(uri, match);

      expect(result.profile.display).toBe("@bob_dev");
      expect(result.profile.uri).toBe("https://x.com/bob_dev");
    });

    it("sets proof target to tweet full_text", () => {
      const uri = "https://x.com/alice/status/1234567890";
      const match = uri.match(twitter.reUri)!;
      const result = twitter.processURI(uri, match);

      expect(result.proof.target).toHaveLength(1);
      expect(result.proof.target[0].path).toEqual(["data", "tweetResult", "result", "legacy", "full_text"]);
      expect(result.proof.target[0].relation).toBe("contains");
    });
  });

  describe("postprocess", () => {
    it("extracts screen name and avatar from GraphQL response", () => {
      const uri = "https://x.com/alice/status/1234567890";
      const match = uri.match(twitter.reUri)!;

      const graphqlResponse = {
        data: {
          tweetResult: {
            result: {
              legacy: { full_text: "did:plc:abc123" },
              core: {
                user_results: {
                  result: {
                    core: { screen_name: "Alice" },
                    legacy: {
                      screen_name: "Alice",
                      profile_image_url_https: "https://pbs.twimg.com/profile_images/123/photo_normal.jpg",
                      name: "Alice Smith",
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = twitter.postprocess!(graphqlResponse, match);

      expect(result.subject).toBe("Alice");
      expect(result.displayName).toBe("Alice Smith");
      expect(result.profileUrl).toBe("https://x.com/Alice");
      // _normal. should be stripped from avatar URL
      expect(result.avatarUrl).toBe("https://pbs.twimg.com/profile_images/123/photo.jpg");
    });

    it("falls back to URL username when GraphQL data is absent", () => {
      const uri = "https://x.com/fallback_user/status/111";
      const match = uri.match(twitter.reUri)!;

      const result = twitter.postprocess!({}, match);
      expect(result.subject).toBe("fallback_user");
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    // Valid did:plc uses base32 alphabet (a-z, 2-7), exactly 24 chars
    const did = "did:plc:abcdefghijklmnopqrst2345";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    function mockFetch(tweetText: string) {
      const graphqlResponse = {
        data: {
          tweetResult: {
            result: {
              __typename: "Tweet",
              legacy: { full_text: tweetText },
              core: {
                user_results: {
                  result: {
                    core: { screen_name: "alice" },
                    legacy: { screen_name: "alice", profile_image_url_https: "https://pbs.twimg.com/photo_normal.jpg", name: "Alice" },
                  },
                },
              },
            },
          },
        },
      };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          // First call: guest token activation
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ guest_token: "mock_guest_token_123" }),
          })
          // Second call: GraphQL tweet fetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(graphqlResponse),
          }),
      );
    }

    it("verifies a tweet containing the DID", async () => {
      mockFetch(`verifying my identity: ${did}`);

      const claim = createClaim("https://twitter.com/alice/status/1234567890", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("alice");
    });

    it("fails when tweet does not contain the DID", async () => {
      mockFetch("hello world, just a regular tweet");

      const claim = createClaim("https://twitter.com/alice/status/1234567890", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });
  });
});
