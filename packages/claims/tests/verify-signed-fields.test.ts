import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/atproto.js", () => ({
  resolveHandle: vi.fn(),
  resolvePds: vi.fn(),
  listClaimRecords: vi.fn(),
  getRecordByUri: vi.fn(),
}));

vi.mock("../src/crypto/signature.js", () => ({
  verifyES256Signature: vi.fn(),
}));

import { getClaimsForDid } from "../src/verify.js";
import { resolveHandle, resolvePds, listClaimRecords, getRecordByUri } from "../src/atproto.js";
import { verifyES256Signature } from "../src/crypto/signature.js";
import type { ClaimRecord } from "../src/types.js";

const TRUSTED_DID = "did:plc:trustedkeytrace";
const USER_DID = "did:plc:usertest123";
const SIGNED_AT = "2026-01-15T12:00:00.000Z";

function makeRecord(overrides: { identity: ClaimRecord["identity"]; signedFields: string[] }): ClaimRecord {
  return {
    $type: "dev.keytrace.claim",
    type: "npmorg",
    claimUri: "https://www.npmjs.com/org/acme",
    identity: overrides.identity,
    sigs: [
      {
        kid: "attest:npmorg",
        src: `at://${TRUSTED_DID}/dev.keytrace.serverPublicKey/2026-01-15`,
        signedAt: SIGNED_AT,
        attestation: "header.payload.signature",
        signedFields: overrides.signedFields,
      },
    ],
    createdAt: SIGNED_AT,
  };
}

async function verifyRecord(record: ClaimRecord) {
  vi.mocked(listClaimRecords).mockResolvedValue([{ uri: "at://user/dev.keytrace.claim/abc", rkey: "abc", value: record }]);
  const result = await getClaimsForDid(USER_DID);
  return result.claims[0];
}

describe("signed field reconstruction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveHandle).mockResolvedValue(TRUSTED_DID);
    vi.mocked(resolvePds).mockResolvedValue("https://pds.example.com");
    vi.mocked(getRecordByUri).mockResolvedValue({
      $type: "dev.keytrace.serverPublicKey",
      publicJwk: JSON.stringify({ kty: "EC", crv: "P-256", x: "abc", y: "def" }),
      validFrom: "2026-01-15T00:00:00.000Z",
      validUntil: "2026-01-15T23:59:59.999Z",
    });
    vi.mocked(verifyES256Signature).mockResolvedValue(true);
  });

  it("reconstructs identity.account for claims that carry one", async () => {
    const claim = await verifyRecord(
      makeRecord({
        identity: { subject: "acme", account: "alice" },
        signedFields: ["claimUri", "did", "identity.account", "identity.subject", "type"],
      }),
    );

    expect(claim.verified).toBe(true);
    expect(vi.mocked(verifyES256Signature).mock.calls[0][0]).toEqual({
      claimUri: "https://www.npmjs.com/org/acme",
      did: USER_DID,
      "identity.account": "alice",
      "identity.subject": "acme",
      type: "npmorg",
    });
  });

  it("omits identity.account entirely for claims that do not carry one", async () => {
    // A present-but-undefined key would canonicalize differently from the signer's payload
    const claim = await verifyRecord(
      makeRecord({
        identity: { subject: "alice" },
        signedFields: ["claimUri", "did", "identity.subject", "type"],
      }),
    );

    expect(claim.verified).toBe(true);
    expect(vi.mocked(verifyES256Signature).mock.calls[0][0]).not.toHaveProperty("identity.account");
  });

  it("fails loudly when a signed field cannot be reconstructed", async () => {
    // Silently dropping it would produce a payload that mismatches the signer's and report the
    // generic "signature verification failed", hiding the actual cause
    const claim = await verifyRecord(
      makeRecord({
        identity: { subject: "acme" },
        signedFields: ["claimUri", "did", "identity.account", "identity.subject", "type"],
      }),
    );

    expect(claim.verified).toBe(false);
    expect(claim.error).toContain("identity.account");
    expect(verifyES256Signature).not.toHaveBeenCalled();
  });
});
