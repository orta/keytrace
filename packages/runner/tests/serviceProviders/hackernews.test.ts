import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import hackernews from "../../src/serviceProviders/hackernews.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "fixtures");

describe("hackernews service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of hackernews.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(hackernews.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    describe("user profile URLs", () => {
      it("extracts username and uses HTML format", () => {
        const uri = "https://news.ycombinator.com/user?id=alice";
        const match = uri.match(hackernews.reUri)!;
        const result = hackernews.processURI(uri, match);

        expect(result.profile.display).toBe("alice");
        expect(result.profile.uri).toBe("https://news.ycombinator.com/user?id=alice");
        expect(result.proof.request.fetcher).toBe("http");
        expect(result.proof.request.uri).toBe(uri);
        expect(result.proof.request.format).toBe("html");
        expect(result.proof.request.options?.headers?.["User-Agent"]).toContain("keytrace-runner");
      });

      it("handles old.ycombinator.com URLs", () => {
        const uri = "https://old.ycombinator.com/user?id=bob123";
        const match = uri.match(hackernews.reUri)!;
        const result = hackernews.processURI(uri, match);

        expect(result.proof.request.uri).toBe(uri);
        expect(result.proof.request.format).toBe("html");
        expect(result.profile.display).toBe("bob123");
      });

      it("sets proof target with CSS selector for about field", () => {
        const uri = "https://news.ycombinator.com/user?id=charlie";
        const match = uri.match(hackernews.reUri)!;
        const result = hackernews.processURI(uri, match);

        expect(result.proof.target).toHaveLength(1);
        expect(result.proof.target[0].css).toBeDefined();
        expect(result.proof.target[0].relation).toBe("contains");
        expect(result.proof.target[0].format).toBe("text");
      });

      it("handles usernames with underscores and hyphens", () => {
        const uri = "https://news.ycombinator.com/user?id=user_name-123";
        const match = uri.match(hackernews.reUri)!;
        const result = hackernews.processURI(uri, match);

        expect(result.profile.display).toBe("user_name-123");
        expect(result.proof.request.uri).toBe(uri);
        expect(result.proof.request.format).toBe("html");
      });
    });

    describe("item URLs (comments/posts)", () => {
      it("extracts item ID and uses HTML format", () => {
        const uri = "https://news.ycombinator.com/item?id=12345678";
        const match = uri.match(hackernews.reUri)!;
        const result = hackernews.processURI(uri, match);

        expect(result.profile.display).toBe("Hacker News");
        expect(result.profile.uri).toBe("https://news.ycombinator.com");
        expect(result.proof.request.fetcher).toBe("http");
        expect(result.proof.request.uri).toBe(uri);
        expect(result.proof.request.format).toBe("html");
        expect(result.proof.request.options?.headers?.["User-Agent"]).toContain("keytrace-runner");
      });

      it("handles old.ycombinator.com item URLs", () => {
        const uri = "https://old.ycombinator.com/item?id=99999";
        const match = uri.match(hackernews.reUri)!;
        const result = hackernews.processURI(uri, match);

        expect(result.proof.request.uri).toBe(uri);
        expect(result.proof.request.format).toBe("html");
      });

      it("sets proof targets with CSS selectors for text and title fields", () => {
        const uri = "https://news.ycombinator.com/item?id=123";
        const match = uri.match(hackernews.reUri)!;
        const result = hackernews.processURI(uri, match);

        expect(result.proof.target).toHaveLength(2);
        expect(result.proof.target[0].css).toBeDefined();
        expect(result.proof.target[0].relation).toBe("contains");
        expect(result.proof.target[1].css).toBeDefined();
        expect(result.proof.target[1].relation).toBe("contains");
      });
    });
  });

  describe("postprocess", () => {
    describe("user profile data", () => {
      it("extracts username from URL for profile pages", () => {
        const uri = "https://news.ycombinator.com/user?id=alice";
        const match = uri.match(hackernews.reUri)!;

        const htmlData = `<html><body><a class="hnuser">alice</a></body></html>`;

        const result = hackernews.postprocess!(htmlData, match);

        expect(result.subject).toBe("alice");
        expect(result.displayName).toBe("alice");
        expect(result.profileUrl).toBe("https://news.ycombinator.com/user?id=alice");
        expect(result.avatarUrl).toBeUndefined();
      });

      it("handles profile URLs consistently", () => {
        const uri = "https://news.ycombinator.com/user?id=bob";
        const match = uri.match(hackernews.reUri)!;

        const htmlData = `<html><body></body></html>`;

        const result = hackernews.postprocess!(htmlData, match);

        expect(result.subject).toBe("bob");
        expect(result.displayName).toBe("bob");
        expect(result.profileUrl).toBe("https://news.ycombinator.com/user?id=bob");
      });
    });

    describe("item data (comments/posts)", () => {
      it("extracts username from comment HTML", () => {
        const uri = "https://news.ycombinator.com/item?id=123";
        const match = uri.match(hackernews.reUri)!;

        const htmlData = `<html><body><a class="hnuser">charlie</a><span class="commtext">This is my verification comment</span></body></html>`;

        const result = hackernews.postprocess!(htmlData, match);

        expect(result.subject).toBe("charlie");
        expect(result.displayName).toBe("charlie");
        expect(result.profileUrl).toBe("https://news.ycombinator.com/user?id=charlie");
        expect(result.avatarUrl).toBeUndefined();
      });

      it("extracts username from story HTML", () => {
        const uri = "https://news.ycombinator.com/item?id=456";
        const match = uri.match(hackernews.reUri)!;

        const htmlData = `<html><body><a class="hnuser">dave</a><span class="titleline">My verification</span></body></html>`;

        const result = hackernews.postprocess!(htmlData, match);

        expect(result.subject).toBe("dave");
        expect(result.displayName).toBe("dave");
        expect(result.profileUrl).toBe("https://news.ycombinator.com/user?id=dave");
      });

      it("falls back to unknown when no author available", () => {
        const uri = "https://news.ycombinator.com/item?id=789";
        const match = uri.match(hackernews.reUri)!;

        const htmlData = `<html><body><span class="titleline">Deleted post</span></body></html>`;

        const result = hackernews.postprocess!(htmlData, match);
        expect(result.subject).toBe("unknown");
        expect(result.displayName).toBe("unknown");
      });
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    // Valid did:plc uses base32 alphabet (a-z, 2-7), exactly 24 chars
    const did = "did:plc:abcdefghijklmnopqrst2345";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    describe("user profile verification", () => {
      function mockFetchUserHtml(username: string, about: string) {
        const html = `<html><body>
          <table>
            <tr><td valign="top">user:</td><td><a class="hnuser">${username}</a></td></tr>
            <tr><td valign="top">about:</td><td>${about}</td></tr>
          </table>
        </body></html>`;

        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(html),
          }),
        );
      }

      it("verifies a HN profile containing the DID in about field", async () => {
        mockFetchUserHtml("alice", `Software engineer. Linking my keytrace.dev - ${did}`);

        const claim = createClaim("https://news.ycombinator.com/user?id=alice", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("alice");
        expect(result.identity?.displayName).toBe("alice");
        expect(result.identity?.profileUrl).toBe("https://news.ycombinator.com/user?id=alice");
      });

      it("verifies with DID at beginning of about field", async () => {
        mockFetchUserHtml("bob", `${did} - My Hacker News profile`);

        const claim = createClaim("https://news.ycombinator.com/user?id=bob", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("bob");
      });

      it("fails when profile does not contain the DID", async () => {
        mockFetchUserHtml("alice", "Just a regular Hacker News user");

        const claim = createClaim("https://news.ycombinator.com/user?id=alice", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.FAILED);
      });

      it("verifies with old.ycombinator.com URL", async () => {
        mockFetchUserHtml("charlie", `Verifying my identity: ${did}`);

        const claim = createClaim("https://old.ycombinator.com/user?id=charlie", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("charlie");
      });

      it("verifies profile with HTML in about field", async () => {
        // HN allows HTML in about field
        mockFetchUserHtml("dave", `<p>Developer &amp; designer.</p><p>Verification: ${did}</p>`);

        const claim = createClaim("https://news.ycombinator.com/user?id=dave", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("dave");
      });
    });

    describe("item (comment/post) verification", () => {
      function mockFetchItemHtml(
        text: string | undefined,
        by: string = "alice",
        title: string | undefined = undefined,
      ) {
        const commentText = text ? `<span class="commtext">${text}</span>` : '';
        const titleText = title ? `<span class="titleline"><a>${title}</a></span>` : '';

        const html = `<html><body>
          <a class="hnuser">${by}</a>
          ${commentText}
          ${titleText}
        </body></html>`;

        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(html),
          }),
        );
      }

      it("verifies a HN comment containing the DID in text", async () => {
        mockFetchItemHtml(`Linking my keytrace.dev - ${did}`, "eve");

        const claim = createClaim("https://news.ycombinator.com/item?id=12345678", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("eve");
        expect(result.identity?.displayName).toBe("eve");
        expect(result.identity?.profileUrl).toBe("https://news.ycombinator.com/user?id=eve");
      });

      it("verifies a HN story containing the DID in text", async () => {
        mockFetchItemHtml(
          `Ask HN: Verifying my identity ${did}`,
          "frank",
          "My verification post",
        );

        const claim = createClaim("https://news.ycombinator.com/item?id=99999", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("frank");
      });

      it("verifies a HN story containing the DID in title", async () => {
        mockFetchItemHtml(undefined, "grace", `Verification: ${did}`);

        const claim = createClaim("https://news.ycombinator.com/item?id=88888", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("grace");
      });

      it("fails when item does not contain the DID", async () => {
        mockFetchItemHtml("Just a regular HN comment", "eve");

        const claim = createClaim("https://news.ycombinator.com/item?id=12345678", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.FAILED);
      });

      it("verifies with old.ycombinator.com item URL", async () => {
        mockFetchItemHtml(`My verification: ${did}`, "heidi");

        const claim = createClaim("https://old.ycombinator.com/item?id=77777", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("heidi");
      });
    });

    describe("vendored HTML fixtures", () => {
      it("verifies real HN profile HTML from orta", async () => {
        const profileHtml = readFileSync(join(fixturesDir, "hn-profile-orta.html"), "utf-8");
        const did = "did:plc:t732otzqvkch7zz5d37537ry";

        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(profileHtml),
          }),
        );

        const claim = createClaim("https://news.ycombinator.com/user?id=orta", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("orta");
        expect(result.identity?.displayName).toBe("orta");
        expect(result.identity?.profileUrl).toBe("https://news.ycombinator.com/user?id=orta");
      });

      it("verifies real HN comment HTML from item 47194392", async () => {
        const itemHtml = readFileSync(join(fixturesDir, "hn-item-47194392.html"), "utf-8");
        const did = "did:plc:t732otzqvkch7zz5d37537ry";

        vi.stubGlobal(
          "fetch",
          vi.fn().mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve(itemHtml),
          }),
        );

        const claim = createClaim("https://news.ycombinator.com/item?id=47194392", did);
        const result = await verifyClaim(claim);

        expect(result.status).toBe(ClaimStatus.VERIFIED);
        expect(result.identity?.subject).toBe("orta");
        expect(result.identity?.displayName).toBe("orta");
        expect(result.identity?.profileUrl).toBe("https://news.ycombinator.com/user?id=orta");
      });
    });
  });
});
