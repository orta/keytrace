import { describe, it, expect } from "vitest";
import { interpolate } from "../src/interpolate.js";
import type { ClaimContext } from "../src/types.js";

const context: ClaimContext = {
  claimId: "kt-a1b2c3d4",
  did: "did:plc:abc123",
  handle: "alice.bsky.social",
  params: {
    gistUrl: "https://gist.github.com/alice/def456",
    domain: "example.com",
  },
};

describe("interpolate", () => {
  it("should replace {claimId}", () => {
    expect(interpolate("{claimId}", context)).toBe("kt-a1b2c3d4");
  });

  it("should replace {did}", () => {
    expect(interpolate("{did}", context)).toBe("did:plc:abc123");
  });

  it("should replace {handle}", () => {
    expect(interpolate("{handle}", context)).toBe("alice.bsky.social");
  });

  it("should replace param keys", () => {
    expect(interpolate("{gistUrl}/raw", context)).toBe("https://gist.github.com/alice/def456/raw");
  });

  it("should replace multiple placeholders in one string", () => {
    expect(interpolate("{claimId}:{did}", context)).toBe("kt-a1b2c3d4:did:plc:abc123");
  });

  it("should leave unknown placeholders intact", () => {
    expect(interpolate("{unknown}", context)).toBe("{unknown}");
  });

  it("should handle strings with no placeholders", () => {
    expect(interpolate("no placeholders here", context)).toBe("no placeholders here");
  });

  it("should handle empty string", () => {
    expect(interpolate("", context)).toBe("");
  });
});
