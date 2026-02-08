import crypto from "node:crypto"

/**
 * Canonicalize an object for signing: sort keys recursively and JSON.stringify.
 * This ensures the same data always produces the same bytes for signing.
 */
export function canonicalize(data: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(data))
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)

  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key])
  }
  return sorted
}

/**
 * Base64url encode a buffer (no padding).
 */
function base64urlEncode(buffer: Buffer): string {
  return buffer.toString("base64url")
}

/**
 * Base64url decode a string.
 */
function base64urlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url")
}

/**
 * Sign claim data using ES256 (ECDSA P-256 + SHA-256) and return a JWS compact serialization.
 *
 * Format: base64url(header).base64url(payload).base64url(signature)
 */
export function signClaim(
  claimData: Record<string, unknown>,
  privateKey: crypto.KeyObject,
): string {
  const header = { alg: "ES256", typ: "JWT" }
  const headerB64 = base64urlEncode(Buffer.from(JSON.stringify(header)))

  const payload = canonicalize(claimData)
  const payloadB64 = base64urlEncode(Buffer.from(payload))

  const signingInput = `${headerB64}.${payloadB64}`

  // Node crypto.sign with ECDSA produces a DER-encoded signature.
  // JWS ES256 requires the raw R||S format (64 bytes for P-256).
  const derSig = crypto.sign("SHA256", Buffer.from(signingInput), privateKey)
  const rawSig = derToRaw(derSig)

  const signatureB64 = base64urlEncode(rawSig)

  return `${headerB64}.${payloadB64}.${signatureB64}`
}

/**
 * Verify a JWS compact signature over claim data.
 * Returns true if the signature is valid.
 */
export function verifyClaim(
  claimData: Record<string, unknown>,
  jws: string,
  publicKey: crypto.KeyObject,
): boolean {
  const parts = jws.split(".")
  if (parts.length !== 3) return false

  const [headerB64, payloadB64, signatureB64] = parts

  // Verify the payload matches the expected canonical claim data
  const expectedPayload = canonicalize(claimData)
  const actualPayload = base64urlDecode(payloadB64).toString("utf-8")
  if (actualPayload !== expectedPayload) return false

  const signingInput = `${headerB64}.${payloadB64}`
  const rawSig = base64urlDecode(signatureB64)

  // Convert raw R||S back to DER for Node crypto.verify
  const derSig = rawToDer(rawSig)

  return crypto.verify(
    "SHA256",
    Buffer.from(signingInput),
    publicKey,
    derSig,
  )
}

/**
 * Convert a DER-encoded ECDSA signature to raw R||S format.
 * P-256 produces 32-byte R and S values (64 bytes total).
 */
function derToRaw(derSig: Buffer): Buffer {
  // DER format: 0x30 [total-len] 0x02 [r-len] [r] 0x02 [s-len] [s]
  let offset = 2 // skip 0x30 and total length

  // Read R
  if (derSig[offset] !== 0x02) throw new Error("Invalid DER signature")
  offset++
  const rLen = derSig[offset]
  offset++
  let r = derSig.subarray(offset, offset + rLen)
  offset += rLen

  // Read S
  if (derSig[offset] !== 0x02) throw new Error("Invalid DER signature")
  offset++
  const sLen = derSig[offset]
  offset++
  let s = derSig.subarray(offset, offset + sLen)

  // Trim leading zero bytes (DER uses signed integers)
  if (r.length > 32) r = r.subarray(r.length - 32)
  if (s.length > 32) s = s.subarray(s.length - 32)

  // Pad to 32 bytes if shorter
  const raw = Buffer.alloc(64)
  r.copy(raw, 32 - r.length)
  s.copy(raw, 64 - s.length)

  return raw
}

/**
 * Convert a raw R||S ECDSA signature to DER format.
 */
function rawToDer(raw: Buffer): Buffer {
  if (raw.length !== 64) throw new Error("Expected 64-byte raw signature")

  let r = raw.subarray(0, 32)
  let s = raw.subarray(32, 64)

  // Remove leading zeros but keep at least one byte
  while (r.length > 1 && r[0] === 0) r = r.subarray(1)
  while (s.length > 1 && s[0] === 0) s = s.subarray(1)

  // Add leading zero if high bit is set (DER signed integer encoding)
  if (r[0] & 0x80) r = Buffer.concat([Buffer.from([0x00]), r])
  if (s[0] & 0x80) s = Buffer.concat([Buffer.from([0x00]), s])

  const rLen = r.length
  const sLen = s.length
  const totalLen = 2 + rLen + 2 + sLen

  return Buffer.concat([
    Buffer.from([0x30, totalLen, 0x02, rLen]),
    r,
    Buffer.from([0x02, sLen]),
    s,
  ])
}
