import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock atproto module before importing verify
vi.mock("../src/atproto.js", () => ({
  resolveHandle: vi.fn(),
  resolvePds: vi.fn(),
  listClaimRecords: vi.fn(),
  getRecordByUri: vi.fn(),
}));

// Mock signature verification to isolate signer tests
vi.mock("../src/crypto/signature.js", () => ({
  verifyES256Signature: vi.fn(),
}));

import { getClaimsForDid, getClaimsForHandle } from "../src/verify.js";
import { resolveHandle, resolvePds, listClaimRecords, getRecordByUri } from "../src/atproto.js";
import { verifyES256Signature } from "../src/crypto/signature.js";
import type { ClaimRecord } from "../src/types.js";

const TRUSTED_DID = "did:plc:trustedkeytrace";
const UNTRUSTED_DID = "did:plc:untrustedevil";
const USER_DID = "did:plc:usertest123";

function makeClaimRecord(signerDid: string): ClaimRecord {
  return {
    $type: "dev.keytrace.claim",
    type: "github-gist",
    claimUri: "https://gist.github.com/alice/abc123",
    identity: { subject: "github:alice" },
    sig: {
      kid: "2026-01-15",
      src: `at://${signerDid}/dev.keytrace.key/2026-01-15`,
      signedAt: "2026-01-15T12:00:00.000Z",
      attestation: "header.payload.signature",
    },
    createdAt: "2026-01-15T12:00:00.000Z",
  };
}

describe("signer validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Default mocks
    vi.mocked(resolvePds).mockResolvedValue("https://pds.example.com");
    vi.mocked(getRecordByUri).mockResolvedValue({
      $type: "dev.keytrace.key",
      publicJwk: JSON.stringify({ kty: "EC", crv: "P-256", x: "abc", y: "def" }),
      validFrom: "2026-01-15T00:00:00.000Z",
      validUntil: "2026-01-15T23:59:59.999Z",
    });
    vi.mocked(verifyES256Signature).mockResolvedValue(true);
  });

  it("should pass claims signed by default trusted signer (keytrace.dev)", async () => {
    vi.mocked(resolveHandle).mockResolvedValue(TRUSTED_DID);
    vi.mocked(listClaimRecords).mockResolvedValue([{ uri: "at://user/dev.keytrace.claim/abc", rkey: "abc", value: makeClaimRecord(TRUSTED_DID) }]);

    const result = await getClaimsForDid(USER_DID);

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].verified).toBe(true);
    const signerStep = result.claims[0].steps.find((s) => s.step === "validate_signer");
    expect(signerStep?.success).toBe(true);
  });

  it("should fail claims signed by an untrusted signer", async () => {
    // resolveHandle is called for "keytrace.dev" (default) → returns TRUSTED_DID
    vi.mocked(resolveHandle).mockResolvedValue(TRUSTED_DID);
    vi.mocked(listClaimRecords).mockResolvedValue([{ uri: "at://user/dev.keytrace.claim/abc", rkey: "abc", value: makeClaimRecord(UNTRUSTED_DID) }]);

    const result = await getClaimsForDid(USER_DID);

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].verified).toBe(false);
    expect(result.claims[0].error).toContain("not from a trusted signer");
    const signerStep = result.claims[0].steps.find((s) => s.step === "validate_signer");
    expect(signerStep?.success).toBe(false);
  });

  it("should not fetch the signing key for untrusted signers", async () => {
    vi.mocked(resolveHandle).mockResolvedValue(TRUSTED_DID);
    vi.mocked(listClaimRecords).mockResolvedValue([{ uri: "at://user/dev.keytrace.claim/abc", rkey: "abc", value: makeClaimRecord(UNTRUSTED_DID) }]);

    await getClaimsForDid(USER_DID);

    // getRecordByUri should not be called since the claim fails the signer check early
    expect(getRecordByUri).not.toHaveBeenCalled();
  });

  it("should accept custom trustedSigners", async () => {
    // Resolve "custom.dev" → UNTRUSTED_DID (making it trusted via custom list)
    vi.mocked(resolveHandle).mockImplementation(async (handle) => {
      if (handle === "custom.dev") return UNTRUSTED_DID;
      return TRUSTED_DID;
    });
    vi.mocked(listClaimRecords).mockResolvedValue([{ uri: "at://user/dev.keytrace.claim/abc", rkey: "abc", value: makeClaimRecord(UNTRUSTED_DID) }]);

    const result = await getClaimsForDid(USER_DID, { trustedSigners: ["custom.dev"] });

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].verified).toBe(true);
    const signerStep = result.claims[0].steps.find((s) => s.step === "validate_signer");
    expect(signerStep?.success).toBe(true);
  });

  it("should support multiple trusted signers", async () => {
    const SECOND_DID = "did:plc:secondtrusted";
    vi.mocked(resolveHandle).mockImplementation(async (handle) => {
      if (handle === "keytrace.dev") return TRUSTED_DID;
      if (handle === "npmx.dev") return SECOND_DID;
      throw new Error("unknown handle");
    });
    vi.mocked(listClaimRecords).mockResolvedValue([
      { uri: "at://user/dev.keytrace.claim/a", rkey: "a", value: makeClaimRecord(TRUSTED_DID) },
      { uri: "at://user/dev.keytrace.claim/b", rkey: "b", value: makeClaimRecord(SECOND_DID) },
      { uri: "at://user/dev.keytrace.claim/c", rkey: "c", value: makeClaimRecord(UNTRUSTED_DID) },
    ]);

    const result = await getClaimsForDid(USER_DID, {
      trustedSigners: ["keytrace.dev", "npmx.dev"],
    });

    expect(result.claims).toHaveLength(3);
    expect(result.claims[0].verified).toBe(true);
    expect(result.claims[1].verified).toBe(true);
    expect(result.claims[2].verified).toBe(false);
    expect(result.claims[2].error).toContain("not from a trusted signer");
    expect(result.summary).toEqual({ total: 3, verified: 2, failed: 1 });
  });

  it("should fail claims with missing sig.src", async () => {
    vi.mocked(resolveHandle).mockResolvedValue(TRUSTED_DID);
    const claim = makeClaimRecord(TRUSTED_DID);
    // @ts-expect-error - intentionally removing src
    claim.sig.src = undefined;
    vi.mocked(listClaimRecords).mockResolvedValue([{ uri: "at://user/dev.keytrace.claim/abc", rkey: "abc", value: claim }]);

    const result = await getClaimsForDid(USER_DID);

    expect(result.claims[0].verified).toBe(false);
    expect(result.claims[0].error).toContain("Missing signature fields");
  });

  it("should pass trustedSigners through getClaimsForHandle", async () => {
    vi.mocked(resolveHandle).mockImplementation(async (handle) => {
      if (handle === "alice.bsky.social") return USER_DID;
      if (handle === "keytrace.dev") return TRUSTED_DID;
      throw new Error("unknown handle");
    });
    vi.mocked(listClaimRecords).mockResolvedValue([{ uri: "at://user/dev.keytrace.claim/abc", rkey: "abc", value: makeClaimRecord(UNTRUSTED_DID) }]);

    const result = await getClaimsForHandle("alice.bsky.social");

    expect(result.handle).toBe("alice.bsky.social");
    expect(result.claims[0].verified).toBe(false);
    expect(result.claims[0].error).toContain("not from a trusted signer");
  });
});
