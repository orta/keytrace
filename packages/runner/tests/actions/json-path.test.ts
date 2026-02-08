import { describe, it, expect } from "vitest";
import { jsonPath } from "../../src/actions/json-path.js";

describe("jsonPath", () => {
  const obj = {
    keytrace: "kt-123",
    did: "did:plc:abc",
    nested: {
      deep: {
        value: "found",
      },
    },
    items: ["a", "b", "c"],
  };

  it("should extract top-level key with $. prefix", () => {
    expect(jsonPath(obj, "$.keytrace")).toBe("kt-123");
  });

  it("should extract top-level key without $. prefix", () => {
    expect(jsonPath(obj, "keytrace")).toBe("kt-123");
  });

  it("should extract nested values", () => {
    expect(jsonPath(obj, "$.nested.deep.value")).toBe("found");
  });

  it("should extract array items by index", () => {
    expect(jsonPath(obj, "$.items[0]")).toBe("a");
    expect(jsonPath(obj, "$.items[2]")).toBe("c");
  });

  it("should return undefined for missing paths", () => {
    expect(jsonPath(obj, "$.nonexistent")).toBeUndefined();
  });

  it("should return undefined for deeply missing paths", () => {
    expect(jsonPath(obj, "$.nested.missing.value")).toBeUndefined();
  });

  it("should parse JSON strings", () => {
    const json = '{"keytrace": "kt-456", "did": "did:plc:xyz"}';
    expect(jsonPath(json, "$.keytrace")).toBe("kt-456");
    expect(jsonPath(json, "$.did")).toBe("did:plc:xyz");
  });
});
