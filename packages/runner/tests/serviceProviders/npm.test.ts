import { describe, it, expect, vi, beforeEach } from "vitest";
import npm from "../../src/serviceProviders/npm.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

const DID = "did:plc:abcdefghijklmnopqrst2345";

function buildPackument(opts: { versions?: Record<string, { did?: string; publisher?: string }>; maintainers?: string[] }) {
  const versions: Record<string, unknown> = {};
  const time: Record<string, string> = {};
  let i = 1;

  for (const [version, spec] of Object.entries(opts.versions ?? {})) {
    versions[version] = {
      version,
      ...(spec.did ? { did: spec.did } : {}),
      _npmUser: { name: spec.publisher ?? "alice", email: "alice@example.com" },
    };
    time[version] = `2026-01-0${i++}T00:00:00.000Z`;
  }

  return {
    versions,
    time,
    maintainers: (opts.maintainers ?? ["alice"]).map((name) => ({ name, email: `${name}@example.com` })),
  };
}

function mockRegistry(routes: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const key = Object.keys(routes).find((k) => url.includes(k));
      if (key === undefined) throw new Error(`Unexpected fetch: ${url}`);
      return { ok: true, json: () => Promise.resolve(routes[key]) };
    }),
  );
}

describe("npm service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of npm.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(npm.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("fetches the scoped packument", () => {
      const uri = "https://www.npmjs.com/package/@alice/keytrace-claim";
      const result = npm.processURI(uri, uri.match(npm.reUri)!);
      expect(result.proof.request.uri).toBe("https://registry.npmjs.org/@alice/keytrace-claim");
    });

    it("fetches the legacy unscoped packument", () => {
      const uri = "https://www.npmjs.com/package/keytrace-alice";
      const result = npm.processURI(uri, uri.match(npm.reUri)!);
      expect(result.proof.request.uri).toBe("https://registry.npmjs.org/keytrace-alice");
    });
  });

  describe("postprocess", () => {
    const scopedMatch = "https://www.npmjs.com/package/@alice/keytrace-claim".match(npm.reUri)!;

    it("takes the subject from the scope rather than from maintainers", () => {
      // maintainers is an unordered set of everyone with write access, so its first entry is not
      // reliably the account being claimed
      const data = buildPackument({
        versions: { "0.0.1": { did: DID, publisher: "alice" } },
        maintainers: ["bob", "alice"],
      });

      expect(npm.postprocess!(data, scopedMatch, DID).subject).toBe("alice");
    });

    it("leaves account unset, since the subject is the account", () => {
      const data = buildPackument({ versions: { "0.0.1": { did: DID, publisher: "alice" } } });
      expect(npm.postprocess!(data, scopedMatch, DID).account).toBeUndefined();
    });

    it("refuses to attest when a collaborator published the DID-bearing version", () => {
      const data = buildPackument({
        versions: { "0.0.1": { did: DID, publisher: "bob" } },
        maintainers: ["alice", "bob"],
      });

      expect(() => npm.postprocess!(data, scopedMatch, DID)).toThrow(/published by bob, not by @alice/);
    });

    it("refuses to attest when no version carries the DID", () => {
      const data = buildPackument({ versions: { "0.0.1": { publisher: "alice" } } });
      expect(() => npm.postprocess!(data, scopedMatch, DID)).toThrow(/did/i);
    });

    it("rejects an org scope offline, without needing the scope classifier", () => {
      // npm usernames and org names share one namespace, so no user can be named after an
      // existing org — a publisher who differs from the scope is the tell, and it needs no
      // network call. This is what actually keeps org scopes out of the npm type; verifyAccess
      // only improves the error message.
      const orgMatch = "https://www.npmjs.com/package/@acme/keytrace-claim".match(npm.reUri)!;
      const data = buildPackument({
        versions: { "0.0.1": { did: DID, publisher: "alice" } },
        maintainers: ["alice", "bob"],
      });

      expect(() => npm.postprocess!(data, orgMatch, DID)).toThrow(/published by alice, not by @acme/);
    });

    describe("legacy unscoped packages", () => {
      const legacyMatch = "https://www.npmjs.com/package/keytrace-alice".match(npm.reUri)!;

      it("accepts when the named handle maintains the package", () => {
        const data = buildPackument({
          versions: { "0.0.1": { did: DID, publisher: "alice" } },
          maintainers: ["alice"],
        });

        expect(npm.postprocess!(data, legacyMatch, DID).subject).toBe("alice");
      });

      it("rejects a package name that claims a handle which does not maintain it", () => {
        const data = buildPackument({
          versions: { "0.0.1": { did: DID, publisher: "mallory" } },
          maintainers: ["mallory"],
        });

        expect(() => npm.postprocess!(data, legacyMatch, DID)).toThrow(/does not maintain/);
      });
    });
  });

  describe("verifyAccess", () => {
    const scopedMatch = "https://www.npmjs.com/package/@alice/keytrace-claim".match(npm.reUri)!;
    const ctx = (routes: Record<string, unknown>, match = scopedMatch) => ({
      did: DID,
      match,
      identity: { subject: "alice" },
      fetch: async (request: { uri: string }) => {
        const key = Object.keys(routes).find((k) => request.uri.includes(k));
        if (key === undefined) throw new Error(`Unexpected fetch: ${request.uri}`);
        return routes[key];
      },
    });

    it("passes for a personal scope", async () => {
      expect(await npm.verifyAccess!(ctx({ "/-/org/alice/user": { alice: "owner" } }))).toBeNull();
    });

    it("rejects an org scope, pointing at the npmorg claim type", async () => {
      const reason = await npm.verifyAccess!(ctx({ "/-/org/alice/user": {} }));
      expect(reason).toMatch(/npm organization/);
    });

    it("skips the check for legacy unscoped packages", async () => {
      const legacyMatch = "https://www.npmjs.com/package/keytrace-alice".match(npm.reUri)!;
      expect(await npm.verifyAccess!(ctx({}, legacyMatch))).toBeNull();
    });

    it("does not fail an otherwise-good claim when the registry is unreachable", async () => {
      const reason = await npm.verifyAccess!({
        did: DID,
        match: scopedMatch,
        identity: { subject: "alice" },
        fetch: async () => {
          throw new Error("ECONNRESET");
        },
      });
      expect(reason).toBeNull();
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("verifies a personal scope claim end to end", async () => {
      mockRegistry({
        "registry.npmjs.org/@alice/keytrace-claim": buildPackument({
          versions: { "0.0.1": { did: DID, publisher: "alice" } },
        }),
        "/-/org/alice/user": { alice: "owner" },
      });

      const claim = createClaim("https://www.npmjs.com/package/@alice/keytrace-claim", DID);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("alice");
      expect(result.identity?.profileUrl).toBe("https://www.npmjs.com/~alice");
    });

    it("fails an org scope submitted as a personal npm claim", async () => {
      mockRegistry({
        "registry.npmjs.org/@acme/keytrace-claim": buildPackument({
          versions: { "0.0.1": { did: DID, publisher: "acme" } },
        }),
        "/-/org/acme/user": {},
      });

      const claim = createClaim("https://www.npmjs.com/package/@acme/keytrace-claim", DID);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
      expect(result.errors.join(" ")).toMatch(/npm organization/);
    });
  });
});
