import { describe, it, expect, vi, beforeEach } from "vitest";
import npmorg from "../../src/serviceProviders/npmorg.js";
import { createClaim, verifyClaim } from "../../src/claim.js";
import { ClaimStatus } from "../../src/types.js";

const DID = "did:plc:abcdefghijklmnopqrst2345";
// The package is named after its publisher so each org member can claim independently
const ORG_URI = "https://www.npmjs.com/package/@acme/keytrace-claim-alice";

interface VersionSpec {
  did?: string;
  publisher?: string;
  /** Published via npm trusted publishing, so attributable to CI rather than a person */
  automation?: boolean;
  time?: string;
}

function buildPackument(versions: Record<string, VersionSpec>) {
  const out: Record<string, unknown> = {};
  const time: Record<string, string> = {};

  for (const [version, spec] of Object.entries(versions)) {
    out[version] = {
      name: "@acme/keytrace-claim-alice",
      version,
      ...(spec.did ? { did: spec.did } : {}),
      _npmUser: spec.automation
        ? { name: "GitHub Actions", email: "npm-oidc-no-reply@github.com", trustedPublisher: { id: "github" } }
        : { name: spec.publisher ?? "alice", email: "alice@example.com" },
    };
    time[version] = spec.time ?? `2026-01-0${Object.keys(time).length + 1}T00:00:00.000Z`;
  }

  return { versions: out, time, "dist-tags": { latest: Object.keys(versions).at(-1) } };
}

/**
 * Route mocked responses by URL so a single test can cover the packument fetch plus the two
 * registry lookups verifyAccess makes.
 */
function mockRegistry(routes: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const key = Object.keys(routes).find((k) => url.includes(k));
      if (key === undefined) throw new Error(`Unexpected fetch: ${url}`);
      const body = routes[key];
      if (body === "404") return { ok: false, status: 404, statusText: "Not Found" };
      return { ok: true, json: () => Promise.resolve(body) };
    }),
  );
}

describe("npmorg service provider", () => {
  describe("URI matching", () => {
    for (const { uri, shouldMatch } of npmorg.tests) {
      it(`${shouldMatch ? "accepts" : "rejects"} ${uri}`, () => {
        const match = uri.match(npmorg.reUri);
        expect(Boolean(match)).toBe(shouldMatch);
      });
    }
  });

  describe("processURI", () => {
    it("fetches the named package but points the profile at the org", () => {
      const result = npmorg.processURI(ORG_URI, ORG_URI.match(npmorg.reUri)!);

      expect(result.profile.display).toBe("@acme");
      expect(result.profile.uri).toBe("https://www.npmjs.com/org/acme");
      expect(result.proof.request.uri).toBe("https://registry.npmjs.org/@acme/keytrace-claim-alice");
      expect(result.proof.request.format).toBe("json");
      expect(result.proof.target[0].path).toEqual(["versions", "*", "did"]);
    });

    it("accepts a package the org already publishes", () => {
      const uri = "https://www.npmjs.com/package/@acme/design-tokens";
      const result = npmorg.processURI(uri, uri.match(npmorg.reUri)!);
      expect(result.proof.request.uri).toBe("https://registry.npmjs.org/@acme/design-tokens");
    });

    it("normalises casing", () => {
      const uri = "https://www.npmjs.com/package/@ACME/Design-Tokens";
      const result = npmorg.processURI(uri, uri.match(npmorg.reUri)!);
      expect(result.proof.request.uri).toBe("https://registry.npmjs.org/@acme/design-tokens");
    });
  });

  describe("postprocess", () => {
    const match = ORG_URI.match(npmorg.reUri)!;

    it("records the scope as subject and the publisher as account", () => {
      const data = buildPackument({ "0.0.1": { did: DID, publisher: "alice" } });
      const result = npmorg.postprocess!(data, match, DID);

      expect(result.subject).toBe("acme");
      expect(result.account).toBe("alice");
      expect(result.profileUrl).toBe("https://www.npmjs.com/org/acme");
    });

    it("attributes the claim to whoever published the DID, not to the latest publisher", () => {
      // Anyone else with write access to @acme can publish a newer version; taking dist-tags.latest
      // would credit mallory with alice's claim
      const data = buildPackument({
        "0.0.1": { did: DID, publisher: "alice", time: "2026-01-01T00:00:00.000Z" },
        "0.0.2": { publisher: "mallory", time: "2026-02-01T00:00:00.000Z" },
      });

      expect(npmorg.postprocess!(data, match, DID).account).toBe("alice");
    });

    it("prefers the most recent version carrying the DID", () => {
      const data = buildPackument({
        "0.0.1": { did: DID, publisher: "alice", time: "2026-01-01T00:00:00.000Z" },
        "0.0.2": { did: DID, publisher: "bob", time: "2026-02-01T00:00:00.000Z" },
      });

      expect(npmorg.postprocess!(data, match, DID).account).toBe("bob");
    });

    it("takes the account from the publisher, not from the package name", () => {
      // The name is decorative — someone can prove access from any package under the scope
      const uri = "https://www.npmjs.com/package/@acme/design-tokens";
      const data = buildPackument({ "0.0.1": { did: DID, publisher: "alice" } });

      expect(npmorg.postprocess!(data, uri.match(npmorg.reUri)!, DID).account).toBe("alice");
    });

    it("ignores versions carrying a different DID", () => {
      const data = buildPackument({
        "0.0.1": { did: DID, publisher: "alice", time: "2026-01-01T00:00:00.000Z" },
        "0.0.2": { did: "did:plc:somebodyelse00000000000", publisher: "mallory", time: "2026-02-01T00:00:00.000Z" },
      });

      expect(npmorg.postprocess!(data, match, DID).account).toBe("alice");
    });

    it("refuses to attest when no version carries the DID", () => {
      const data = buildPackument({ "0.0.1": { publisher: "alice" } });
      expect(() => npmorg.postprocess!(data, match, DID)).toThrow(/did/i);
    });

    it("refuses to attest a version published by an automation identity", () => {
      // Trusted publishing signs as "GitHub Actions", which names no npm user to bind to
      const data = buildPackument({ "0.0.1": { did: DID, automation: true } });
      expect(() => npmorg.postprocess!(data, match, DID)).toThrow(/automation identity/);
    });
  });

  describe("verifyAccess", () => {
    const match = ORG_URI.match(npmorg.reUri)!;
    const ctx = (routes: Record<string, unknown>, account?: string) => ({
      did: DID,
      match,
      identity: { subject: "acme", account },
      fetch: async (request: { uri: string }) => {
        const key = Object.keys(routes).find((k) => request.uri.includes(k));
        if (key === undefined) throw new Error(`Unexpected fetch: ${request.uri}`);
        return routes[key];
      },
    });

    it("passes when the scope is an org the account can still publish to", async () => {
      const reason = await npmorg.verifyAccess!(
        ctx(
          {
            "/-/org/acme/user": {}, // org member lists are private, so an org reports {}
            "/-/org/alice/package": { "@acme/keytrace-claim": "write", "@acme/widget": "write" },
          },
          "alice",
        ),
      );
      expect(reason).toBeNull();
    });

    it("rejects a personal scope, pointing at the npm claim type", async () => {
      const reason = await npmorg.verifyAccess!(ctx({ "/-/org/acme/user": { acme: "owner" } }, "acme"));
      expect(reason).toMatch(/personal npm scope/);
      expect(reason).toMatch(/npm claim type/);
    });

    it("fails once the account loses access, even though the package still exists", async () => {
      const reason = await npmorg.verifyAccess!(
        ctx(
          {
            "/-/org/acme/user": {},
            // alice keeps her own packages but no longer appears under @acme
            "/-/org/alice/package": { "@alice/thing": "write", "unscoped-thing": "write" },
          },
          "alice",
        ),
      );
      expect(reason).toMatch(/alice no longer has publish access under @acme/);
    });

    it("does not accept a scope that merely prefixes the claimed one", async () => {
      const reason = await npmorg.verifyAccess!(ctx({ "/-/org/acme/user": {}, "/-/org/alice/package": { "@acme-corp/thing": "write" } }, "alice"));
      expect(reason).toMatch(/no longer has publish access/);
    });

    it("fails when no account was derived", async () => {
      const reason = await npmorg.verifyAccess!(ctx({}, undefined));
      expect(reason).toMatch(/Could not determine which npm user/);
    });
  });

  describe("verifyClaim integration (mocked fetch)", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("verifies an org claim end to end", async () => {
      mockRegistry({
        "registry.npmjs.org/@acme/keytrace-claim-alice": buildPackument({
          "0.0.1": { did: DID, publisher: "alice" },
        }),
        "/-/org/acme/user": {},
        "/-/org/alice/package": { "@acme/keytrace-claim": "write" },
      });

      const claim = createClaim(ORG_URI, DID);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.identity?.subject).toBe("acme");
      expect(result.identity?.account).toBe("alice");
      expect(result.providerId).toBe("npmorg");
    });

    it("falls through from npm to npmorg for a bare @scope/keytrace-claim on an org", async () => {
      // This URL is a valid personal claim and a valid org claim; nothing in it says which, so
      // npm gets first refusal, fails on the scope classifier, and npmorg picks it up
      mockRegistry({
        "registry.npmjs.org/@acme/keytrace-claim": buildPackument({
          "0.0.1": { did: DID, publisher: "alice" },
        }),
        "/-/org/acme/user": {},
        "/-/org/alice/package": { "@acme/keytrace-claim": "write" },
      });

      const claim = createClaim("https://www.npmjs.com/package/@acme/keytrace-claim", DID);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      // The record's type must follow the provider that actually verified, not matches[0]
      expect(result.providerId).toBe("npmorg");
      expect(result.identity?.subject).toBe("acme");
      expect(result.identity?.account).toBe("alice");
    });

    it("still resolves a bare @scope/keytrace-claim on a personal scope as an npm claim", async () => {
      mockRegistry({
        "registry.npmjs.org/@alice/keytrace-claim": buildPackument({
          "0.0.1": { did: DID, publisher: "alice" },
        }),
        "/-/org/alice/user": { alice: "owner" },
      });

      const claim = createClaim("https://www.npmjs.com/package/@alice/keytrace-claim", DID);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.VERIFIED);
      expect(result.providerId).toBe("npm");
      expect(result.identity?.subject).toBe("alice");
      expect(result.identity?.account).toBeUndefined();
    });

    it("fails a claim whose package still carries the DID after access was revoked", async () => {
      mockRegistry({
        // The package is untouched — the DID is right there in it
        "registry.npmjs.org/@acme/keytrace-claim-alice": buildPackument({
          "0.0.1": { did: DID, publisher: "alice" },
        }),
        "/-/org/acme/user": {},
        // ...but alice is no longer in the org
        "/-/org/alice/package": {},
      });

      const claim = createClaim(ORG_URI, DID);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
      expect(result.errors.join(" ")).toMatch(/no longer has publish access under @acme/);
      // The DID proof itself matched, so the reason must reach the UI some other way
      expect(result.proofDetails?.recommendations?.join(" ")).toMatch(/no longer has publish access/);
    });

    it("fails when the package has no DID at all", async () => {
      mockRegistry({
        "registry.npmjs.org/@acme/keytrace-claim-alice": buildPackument({ "0.0.1": { publisher: "alice" } }),
      });

      const claim = createClaim(ORG_URI, DID);
      const result = await verifyClaim(claim);

      expect(result.status).toBe(ClaimStatus.FAILED);
    });
  });

  describe("getRecommendations", () => {
    const match = ORG_URI.match(npmorg.reUri)!;

    it("reports when no version declares a did field", () => {
      const recs = npmorg.getRecommendations!(buildPackument({ "0.0.1": { publisher: "alice" } }), match);
      expect(recs.join(" ")).toMatch(/no version|None of the/i);
    });

    it("echoes a mismatched did so the user can see what was found", () => {
      const data = buildPackument({ "0.0.1": { did: "did:plc:someoneelse", publisher: "alice" } });
      const recs = npmorg.getRecommendations!(data, match);
      expect(recs.join(" ")).toContain("did:plc:someoneelse");
    });

    it("reports an entirely unpublished package", () => {
      const recs = npmorg.getRecommendations!({ versions: {} }, match);
      expect(recs.join(" ")).toMatch(/No published versions/);
    });
  });
});
