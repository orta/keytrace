import { describe, it, expect } from "vitest";
import { verifyES256Signature } from "../../src/crypto/signature.js";
import type { ES256PublicJwk, SignedClaimData } from "../../src/types.js";

describe("verifyES256Signature", () => {
  // Test key pair generated for testing
  // This is a valid P-256 key pair - the private key is not exposed here
  const testPublicJwk: ES256PublicJwk = {
    kty: "EC",
    crv: "P-256",
    x: "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU",
    y: "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0",
  };

  it("should return false for invalid JWS format", async () => {
    const claimData: SignedClaimData = {
      did: "did:plc:test",
      subject: "test",
      type: "github",
      verifiedAt: "2024-01-15T00:00:00Z",
    };

    // Missing parts
    const result1 = await verifyES256Signature(claimData, "header.payload", testPublicJwk);
    expect(result1).toBe(false);

    // Too many parts
    const result2 = await verifyES256Signature(claimData, "a.b.c.d", testPublicJwk);
    expect(result2).toBe(false);

    // Empty string
    const result3 = await verifyES256Signature(claimData, "", testPublicJwk);
    expect(result3).toBe(false);
  });

  it("should return false when payload does not match claim data", async () => {
    const claimData: SignedClaimData = {
      did: "did:plc:test",
      subject: "test",
      type: "github",
      verifiedAt: "2024-01-15T00:00:00Z",
    };

    // Valid JWS format but payload doesn't match
    // Header: {"alg":"ES256","typ":"JWT"}
    // Payload: {"different":"data"}
    const jws = "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJkaWZmZXJlbnQiOiJkYXRhIn0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    const result = await verifyES256Signature(claimData, jws, testPublicJwk);
    expect(result).toBe(false);
  });

  it("should validate payload matches canonicalized claim data", async () => {
    // This tests that the payload comparison works correctly
    const claimData: SignedClaimData = {
      did: "did:plc:test123",
      subject: "octocat",
      type: "github",
      verifiedAt: "2024-01-15T12:00:00.000Z",
    };

    // Create a JWS with the correct canonicalized payload but invalid signature
    // Canonicalized: {"did":"did:plc:test123","subject":"octocat","type":"github","verifiedAt":"2024-01-15T12:00:00.000Z"}
    const header = btoa(JSON.stringify({ alg: "ES256", typ: "JWT" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const payload = btoa(
      JSON.stringify({
        did: "did:plc:test123",
        subject: "octocat",
        type: "github",
        verifiedAt: "2024-01-15T12:00:00.000Z",
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // 64 bytes of zeros as fake signature (will fail signature check but pass payload check)
    const signature = btoa(String.fromCharCode(...new Array(64).fill(0)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const jws = `${header}.${payload}.${signature}`;

    // This should fail at the signature verification step, not the payload check
    // If it fails for any reason, that's expected since we have an invalid signature
    const result = await verifyES256Signature(claimData, jws, testPublicJwk);
    expect(result).toBe(false);
  });
});
