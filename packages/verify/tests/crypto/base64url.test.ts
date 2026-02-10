import { describe, it, expect } from "vitest";
import { base64urlDecode, base64urlDecodeToBytes } from "../../src/crypto/base64url.js";

describe("base64url", () => {
  describe("base64urlDecode", () => {
    it("should decode a simple string", () => {
      // "hello" in base64url
      const encoded = "aGVsbG8";
      expect(base64urlDecode(encoded)).toBe("hello");
    });

    it("should handle URL-safe characters", () => {
      // Characters that differ between base64 and base64url
      // base64url uses - instead of + and _ instead of /
      const encoded = "PDw_Pj4-"; // "<<?>>" in base64url
      expect(base64urlDecode(encoded)).toBe("<<?>>>");
    });

    it("should decode JSON payload", () => {
      // '{"test":true}' in base64url
      const encoded = "eyJ0ZXN0Ijp0cnVlfQ";
      expect(base64urlDecode(encoded)).toBe('{"test":true}');
    });
  });

  describe("base64urlDecodeToBytes", () => {
    it("should decode to bytes", () => {
      const encoded = "aGVsbG8";
      const bytes = base64urlDecodeToBytes(encoded);
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(5);
      expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]); // "hello" ASCII
    });

    it("should handle padding correctly", () => {
      // Test with various padding scenarios
      const encoded1 = "YQ"; // "a" - needs == padding
      const encoded2 = "YWI"; // "ab" - needs = padding
      const encoded3 = "YWJj"; // "abc" - no padding needed

      expect(base64urlDecodeToBytes(encoded1).length).toBe(1);
      expect(base64urlDecodeToBytes(encoded2).length).toBe(2);
      expect(base64urlDecodeToBytes(encoded3).length).toBe(3);
    });
  });
});
