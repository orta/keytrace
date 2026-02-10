import { describe, it, expect } from "vitest";
import { canonicalize } from "../../src/crypto/canonicalize.js";

describe("canonicalize", () => {
  it("should sort object keys alphabetically", () => {
    const input = { z: 1, a: 2, m: 3 };
    const result = canonicalize(input);
    expect(result).toBe('{"a":2,"m":3,"z":1}');
  });

  it("should handle nested objects", () => {
    const input = { outer: { z: 1, a: 2 }, first: true };
    const result = canonicalize(input);
    expect(result).toBe('{"first":true,"outer":{"a":2,"z":1}}');
  });

  it("should handle arrays (preserve order)", () => {
    const input = { arr: [3, 1, 2] };
    const result = canonicalize(input);
    expect(result).toBe('{"arr":[3,1,2]}');
  });

  it("should handle arrays with objects", () => {
    const input = { arr: [{ z: 1, a: 2 }] };
    const result = canonicalize(input);
    expect(result).toBe('{"arr":[{"a":2,"z":1}]}');
  });

  it("should handle null values", () => {
    const input = { a: null, b: 1 };
    const result = canonicalize(input);
    expect(result).toBe('{"a":null,"b":1}');
  });

  it("should be deterministic", () => {
    const input = { type: "github", did: "did:plc:abc", subject: "user", verifiedAt: "2024-01-15T00:00:00Z" };
    const result1 = canonicalize(input);
    const result2 = canonicalize(input);
    expect(result1).toBe(result2);
  });

  it("should produce expected output for SignedClaimData", () => {
    const claimData = {
      did: "did:plc:test123",
      subject: "octocat",
      type: "github",
      verifiedAt: "2024-01-15T12:00:00.000Z",
    };
    const result = canonicalize(claimData);
    // Keys should be sorted: did, subject, type, verifiedAt
    expect(result).toBe('{"did":"did:plc:test123","subject":"octocat","type":"github","verifiedAt":"2024-01-15T12:00:00.000Z"}');
  });
});
