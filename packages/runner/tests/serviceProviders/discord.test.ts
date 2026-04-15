import { describe, it, expect, vi, beforeEach } from "vitest";
import discord from "../../src/serviceProviders/discord.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

describe("discord service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of discord.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(discord.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("extracts invite code from discord.gg URL", () => {
      const uri = "https://discord.gg/abc123";
      const match = uri.match(discord.reUri)!;
      const result = discord.processURI(uri, match);

      expect(result.profile.display).toBe("abc123");
      expect(result.profile.uri).toBe("https://discord.gg/abc123");
      expect(result.proof.request.fetcher).toBe("http");
      expect(result.proof.request.uri).toBe("https://discord.com/api/v10/invites/abc123?with_counts=false&with_expiration=true");
      expect(result.proof.request.format).toBe("json");
    });

    it("extracts invite code from discord.com/invite URL", () => {
      const uri = "https://discord.com/invite/my-server";
      const match = uri.match(discord.reUri)!;
      const result = discord.processURI(uri, match);

      expect(result.profile.display).toBe("my-server");
      expect(result.proof.request.uri).toBe("https://discord.com/api/v10/invites/my-server?with_counts=false&with_expiration=true");
    });

    it("sets proof targets to guild name and description", () => {
      const uri = "https://discord.gg/abc123";
      const match = uri.match(discord.reUri)!;
      const result = discord.processURI(uri, match);

      expect(result.proof.target).toHaveLength(2);
      expect(result.proof.target[0].path).toEqual(["guild", "name"]);
      expect(result.proof.target[0].relation).toBe("contains");
      expect(result.proof.target[1].path).toEqual(["guild", "description"]);
      expect(result.proof.target[1].relation).toBe("contains");
    });
  });

  describe("postprocess", () => {
    it("extracts inviter username and avatar", () => {
      const uri = "https://discord.gg/abc123";
      const match = uri.match(discord.reUri)!;

      const inviteResponse = {
        guild: {
          id: "123456789",
          name: "My Server",
          icon: "guild_icon_hash",
        },
        inviter: {
          id: "987654321",
          username: "alice",
          global_name: "Alice Smith",
          avatar: "avatar_hash",
        },
      };

      const result = discord.postprocess!(inviteResponse, match);

      expect(result.subject).toBe("alice");
      expect(result.displayName).toBe("Alice Smith");
      expect(result.profileUrl).toBe("https://discord.com/users/987654321");
      expect(result.avatarUrl).toBe("https://cdn.discordapp.com/avatars/987654321/avatar_hash.png");
    });

    it("falls back to guild info when no inviter", () => {
      const uri = "https://discord.gg/abc123";
      const match = uri.match(discord.reUri)!;

      const inviteResponse = {
        guild: {
          id: "123456789",
          name: "My Server",
          icon: "guild_icon_hash",
        },
      };

      const result = discord.postprocess!(inviteResponse, match);

      expect(result.subject).toBe("My Server");
      expect(result.avatarUrl).toBe("https://cdn.discordapp.com/icons/123456789/guild_icon_hash.png");
      expect(result.profileUrl).toBeUndefined();
    });

    it("handles empty response", () => {
      const uri = "https://discord.gg/abc123";
      const match = uri.match(discord.reUri)!;

      const result = discord.postprocess!({}, match);

      expect(result.subject).toBeUndefined();
      expect(result.avatarUrl).toBeUndefined();
    });
  });

  describe("getRecommendations", () => {
    it("warns when guild data is missing", () => {
      const uri = "https://discord.gg/abc123";
      const match = uri.match(discord.reUri)!;
      const recs = discord.getRecommendations!({}, match);

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]).toContain("invite link");
    });

    it("shows guild name and description when DID not found", () => {
      const uri = "https://discord.gg/abc123";
      const match = uri.match(discord.reUri)!;
      const recs = discord.getRecommendations!(
        { guild: { name: "My Server", description: "A cool server" } },
        match,
      );

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]).toContain("My Server");
      expect(recs[0]).toContain("A cool server");
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    const did = "did:plc:abcdefghijklmnopqrst2345";

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    function mockFetch(guildName: string, guildDescription: string | null = null) {
      const inviteResponse = {
        guild: {
          id: "123456789",
          name: guildName,
          icon: "icon_hash",
          description: guildDescription,
        },
        inviter: {
          id: "987654321",
          username: "alice",
          global_name: "Alice",
          avatar: "avatar_hash",
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(inviteResponse),
        }),
      );
    }

    it("verifies when guild name contains the DID", async () => {
      mockFetch(`keytrace:${did}`);

      const claim = createClaim("https://discord.gg/abc123", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("alice");
    });

    it("verifies when guild description contains the DID", async () => {
      mockFetch("My Server", `Verified identity: ${did}`);

      const claim = createClaim("https://discord.gg/abc123", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
    });

    it("fails when neither name nor description contain the DID", async () => {
      mockFetch("My Cool Server", "Just a regular server");

      const claim = createClaim("https://discord.gg/abc123", did);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });
  });
});
