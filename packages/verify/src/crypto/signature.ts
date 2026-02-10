import type { ES256PublicJwk, SignedClaimData } from "../types.js";
import { canonicalize } from "./canonicalize.js";
import { base64urlDecode, base64urlDecodeToBytes } from "./base64url.js";

/**
 * Verify a JWS ES256 signature using Web Crypto API.
 *
 * @param claimData The claim data that was signed
 * @param jws The JWS compact serialization (header.payload.signature)
 * @param publicJwk The P-256 public key as JWK
 * @returns true if signature is valid, false otherwise
 */
export async function verifyES256Signature(claimData: SignedClaimData, jws: string, publicJwk: ES256PublicJwk): Promise<boolean> {
  const parts = jws.split(".");
  if (parts.length !== 3) return false;

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify payload matches expected canonical form
  const expectedPayload = canonicalize(claimData as unknown as Record<string, unknown>);
  const actualPayload = base64urlDecode(payloadB64);
  if (actualPayload !== expectedPayload) return false;

  // Import JWK as CryptoKey
  const key = await crypto.subtle.importKey("jwk", { ...publicJwk, alg: "ES256", use: "sig" }, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);

  // Web Crypto expects raw signature bytes (R||S format) - which is what JWS ES256 uses
  const signatureBytes = base64urlDecodeToBytes(signatureB64);
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  // Create a fresh ArrayBuffer to satisfy TypeScript's strict BufferSource type
  const signatureBuffer = new ArrayBuffer(signatureBytes.length);
  new Uint8Array(signatureBuffer).set(signatureBytes);

  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signatureBuffer, signingInput);
}
