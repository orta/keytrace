import { describe, it, expect } from "vitest";
import { checkExpect } from "../src/expect.js";

describe("checkExpect", () => {
  describe("equals", () => {
    it("should pass on exact match", () => {
      const result = checkExpect("equals:hello", "hello");
      expect(result.pass).toBe(true);
    });

    it("should fail on mismatch", () => {
      const result = checkExpect("equals:hello", "world");
      expect(result.pass).toBe(false);
      expect(result.message).toContain("hello");
      expect(result.message).toContain("world");
    });

    it("should coerce non-string values", () => {
      const result = checkExpect("equals:42", 42);
      expect(result.pass).toBe(true);
    });

    it("should handle null/undefined", () => {
      const result = checkExpect("equals:", null);
      expect(result.pass).toBe(true);
    });
  });

  describe("contains", () => {
    it("should pass when value contains substring", () => {
      const result = checkExpect("contains:key", "my-keytrace-id");
      expect(result.pass).toBe(true);
    });

    it("should fail when substring not found", () => {
      const result = checkExpect("contains:missing", "hello world");
      expect(result.pass).toBe(false);
    });

    it("should handle exact match as contains", () => {
      const result = checkExpect("contains:exact", "exact");
      expect(result.pass).toBe(true);
    });
  });

  describe("invalid format", () => {
    it("should fail on unknown type", () => {
      const result = checkExpect("startsWith:abc", "abcdef");
      expect(result.pass).toBe(false);
      expect(result.message).toContain("Unknown expect type");
    });

    it("should fail on missing colon", () => {
      const result = checkExpect("nocolon", "value");
      expect(result.pass).toBe(false);
      expect(result.message).toContain("Invalid expect format");
    });
  });
});
