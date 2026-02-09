import { describe, it, expect, vi } from "vitest";
import { runRecipe } from "../src/runner.js";
import type { Recipe, ClaimContext, FetchFn } from "../src/types.js";

const githubRecipe: Recipe = {
  type: "github-gist",
  version: 1,
  displayName: "GitHub Account (via Gist)",
  params: [
    {
      key: "gistUrl",
      label: "Gist URL",
      type: "url",
      extractFrom: "^https://gist\\.github\\.com/([^/]+)/",
    },
  ],
  instructions: {
    steps: ["Create a gist"],
    proofTemplate: '{"keytrace": "{claimId}", "did": "{did}"}',
  },
  verification: {
    steps: [
      { action: "http-get", url: "{gistUrl}/raw/keytrace.json" },
      { action: "json-path", selector: "$.keytrace", expect: "equals:{claimId}" },
      { action: "json-path", selector: "$.did", expect: "equals:{did}" },
    ],
  },
};

const context: ClaimContext = {
  claimId: "kt-a1b2c3d4",
  did: "did:plc:abc123",
  handle: "alice.bsky.social",
  params: {
    gistUrl: "https://gist.github.com/alice/def456",
  },
};

function createMockFetch(body: string): FetchFn {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: () => Promise.resolve(body),
  });
}

describe("runRecipe", () => {
  it("should succeed with valid gist content", async () => {
    const fetchFn = createMockFetch(JSON.stringify({ keytrace: "kt-a1b2c3d4", did: "did:plc:abc123" }));

    const result = await runRecipe(githubRecipe, context, { fetch: fetchFn });

    expect(result.success).toBe(true);
    expect(result.steps).toHaveLength(3);
    expect(result.steps.every((s) => s.success)).toBe(true);
    expect(result.subject).toBe("github:alice");
  });

  it("should fail when claimId does not match", async () => {
    const fetchFn = createMockFetch(JSON.stringify({ keytrace: "kt-wrong", did: "did:plc:abc123" }));

    const result = await runRecipe(githubRecipe, context, { fetch: fetchFn });

    expect(result.success).toBe(false);
    expect(result.steps[0].success).toBe(true); // http-get succeeded
    expect(result.steps[1].success).toBe(false); // json-path expect failed
    expect(result.steps).toHaveLength(2); // stopped after failure
  });

  it("should fail when DID does not match", async () => {
    const fetchFn = createMockFetch(JSON.stringify({ keytrace: "kt-a1b2c3d4", did: "did:plc:wrong" }));

    const result = await runRecipe(githubRecipe, context, { fetch: fetchFn });

    expect(result.success).toBe(false);
    expect(result.steps[0].success).toBe(true);
    expect(result.steps[1].success).toBe(true);
    expect(result.steps[2].success).toBe(false);
  });

  it("should fail when fetch returns error", async () => {
    const fetchFn: FetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () => Promise.resolve("Not Found"),
    });

    const result = await runRecipe(githubRecipe, context, { fetch: fetchFn });

    expect(result.success).toBe(false);
    expect(result.steps[0].success).toBe(false);
    expect(result.steps[0].error).toContain("404");
    expect(result.steps).toHaveLength(1);
  });

  it("should interpolate URL correctly", async () => {
    const fetchFn = createMockFetch(JSON.stringify({ keytrace: "kt-a1b2c3d4", did: "did:plc:abc123" }));

    await runRecipe(githubRecipe, context, { fetch: fetchFn });

    expect(fetchFn).toHaveBeenCalledWith("https://gist.github.com/alice/def456/raw/keytrace.json", expect.any(Object));
  });

  it("should extract subject from params using extractFrom", async () => {
    const fetchFn = createMockFetch(JSON.stringify({ keytrace: "kt-a1b2c3d4", did: "did:plc:abc123" }));

    const result = await runRecipe(githubRecipe, context, { fetch: fetchFn });

    expect(result.subject).toBe("github:alice");
  });

  it("should handle recipe with no params", async () => {
    const simpleRecipe: Recipe = {
      type: "simple",
      version: 1,
      displayName: "Simple Test",
      instructions: { steps: ["Do something"] },
      verification: {
        steps: [
          {
            action: "http-get",
            url: "https://example.com/{did}",
          },
        ],
      },
    };

    const fetchFn = createMockFetch("ok");
    const result = await runRecipe(simpleRecipe, context, { fetch: fetchFn });

    expect(result.success).toBe(true);
    expect(result.subject).toBeUndefined();
  });
});
