import { describe, it, expect } from "vitest";
import { regexMatch } from "../../src/actions/regex-match.js";

describe("regexMatch", () => {
  it("should return first capture group", () => {
    expect(regexMatch("keytrace-verification=did:plc:abc", "keytrace-verification=(.+)")).toBe("did:plc:abc");
  });

  it("should return full match when no capture group", () => {
    expect(regexMatch("hello world", "hello")).toBe("hello");
  });

  it("should handle DID patterns", () => {
    expect(regexMatch("my did is did:plc:abc123 ok", "(did:plc:[a-z0-9]+)")).toBe("did:plc:abc123");
  });

  it("should throw on no match", () => {
    expect(() => regexMatch("hello", "^world$")).toThrow("did not match");
  });
});
