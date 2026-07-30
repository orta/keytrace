import { describe, it, expect, vi } from "vitest";
import { reverseLookup, ReverseLookupError } from "../src/reverse-lookup.js";

function jsonResponse(body: unknown, init?: { ok?: boolean; status?: number; statusText?: string }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? "OK",
    json: async () => body,
  } as unknown as Response;
}

describe("reverseLookup", () => {
  it("queries the reverseLookup XRPC with type and subject", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ total: 0, matches: [] }));

    await reverseLookup("github", "alice", { fetch });

    expect(fetch).toHaveBeenCalledTimes(1);
    const url = new URL(fetch.mock.calls[0][0] as string);
    expect(url.origin).toBe("https://keytrace.dev");
    expect(url.pathname).toBe("/xrpc/dev.keytrace.reverseLookup");
    expect(url.searchParams.get("type")).toBe("github");
    expect(url.searchParams.get("subject")).toBe("alice");
  });

  it("returns the matches from the server", async () => {
    const match = {
      did: "did:plc:abc123",
      claim: "at://did:plc:abc123/dev.keytrace.claim/xyz",
      verifiedAt: "2026-01-15T12:00:00.000Z",
    };
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ total: 1, matches: [match] }));

    const result = await reverseLookup("github", "alice", { fetch });

    expect(result.total).toBe(1);
    expect(result.matches).toEqual([match]);
  });

  it("preserves the recheckSuggested flag on matches", async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        total: 1,
        matches: [{ did: "did:plc:abc", claim: "at://did:plc:abc/dev.keytrace.claim/1", verifiedAt: "2026-01-15T12:00:00.000Z", recheckSuggested: true }],
      }),
    );

    const result = await reverseLookup("dns", "example.com", { fetch });

    expect(result.matches[0].recheckSuggested).toBe(true);
  });

  it("respects a custom serviceUrl", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ total: 0, matches: [] }));

    await reverseLookup("npm", "left-pad", { fetch, serviceUrl: "https://staging.keytrace.dev" });

    const url = new URL(fetch.mock.calls[0][0] as string);
    expect(url.origin).toBe("https://staging.keytrace.dev");
  });

  it("throws ReverseLookupError with the XRPC error code on failure", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "UnknownType", message: "Unknown claim type: bogus" }, { ok: false, status: 400, statusText: "Bad Request" }));

    await expect(reverseLookup("bogus", "whatever", { fetch })).rejects.toMatchObject({
      name: "ReverseLookupError",
      code: "UnknownType",
      status: 400,
      message: "Unknown claim type: bogus",
    });
  });

  it("falls back to a status-based message when the error body is not JSON", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    const err = await reverseLookup("github", "alice", { fetch }).catch((e) => e);

    expect(err).toBeInstanceOf(ReverseLookupError);
    expect(err.status).toBe(500);
    expect(err.message).toContain("500");
  });

  it("tolerates a missing matches array", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ total: 0 }));

    const result = await reverseLookup("github", "alice", { fetch });

    expect(result.matches).toEqual([]);
  });
});
