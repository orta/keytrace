import type { ClaimRecord, ClaimVerificationResult, ES256PublicJwk, KeyRecord, SignedClaimData, VerificationResult, VerificationStep, VerifyOptions } from "./types.js";
import { getPrimarySig } from "./types.js";
import { resolveHandle, resolvePds, listClaimRecords, getRecordByUri } from "./atproto.js";
import { verifyES256Signature } from "./crypto/signature.js";

/** Default trusted signer handles */
const DEFAULT_TRUSTED_SIGNERS = ["keytrace.dev"];

// Re-export types for convenience
export type {
  ClaimIdentity,
  ClaimRecord,
  ClaimSignature,
  ClaimVerificationResult,
  ES256PublicJwk,
  KeyRecord,
  SignedClaimData,
  VerificationResult,
  VerificationStep,
  VerifyOptions,
} from "./types.js";
export { getPrimarySig } from "./types.js";

/**
 * Verify all keytrace claims for a handle.
 *
 * @param handle The ATProto handle (e.g., "alice.bsky.social") or DID
 * @param options Optional configuration
 * @returns Verification results for all claims
 */
export async function getClaimsForHandle(handle: string, options?: VerifyOptions): Promise<VerificationResult> {
  const did = await resolveHandle(handle, options);
  const result = await getClaimsForDid(did, options);

  return {
    ...result,
    handle: handle.startsWith("did:") ? undefined : handle,
  };
}

/**
 * Verify all keytrace claims for a DID.
 *
 * @param did The ATProto DID (e.g., "did:plc:abc123")
 * @param options Optional configuration
 * @returns Verification results for all claims
 */
export async function getClaimsForDid(did: string, options?: VerifyOptions): Promise<VerificationResult> {
  // Resolve trusted signer handles to DIDs once for the whole batch
  const trustedSigners = options?.trustedSigners ?? DEFAULT_TRUSTED_SIGNERS;
  const trustedDids = await resolveTrustedDids(trustedSigners, options);

  // Resolve PDS for the user
  const pdsUrl = await resolvePds(did, options);

  // Fetch all claim records
  let claimRecords: Array<{ uri: string; rkey: string; value: ClaimRecord }>;
  try {
    claimRecords = await listClaimRecords(pdsUrl, did, options);
  } catch {
    // No claims found
    return {
      did,
      claims: [],
      summary: { total: 0, verified: 0, failed: 0 },
    };
  }

  // Verify each claim
  const claimResults: ClaimVerificationResult[] = [];

  for (const record of claimRecords) {
    const result = await verifySingleClaim(did, record.uri, record.rkey, record.value, trustedDids, options);
    claimResults.push(result);
  }

  return {
    did,
    claims: claimResults,
    summary: {
      total: claimResults.length,
      verified: claimResults.filter((c) => c.verified).length,
      failed: claimResults.filter((c) => !c.verified).length,
    },
  };
}

/**
 * Verify a single claim's signature.
 */
async function verifySingleClaim(did: string, uri: string, rkey: string, claim: ClaimRecord, trustedDids: Set<string>, options?: VerifyOptions): Promise<ClaimVerificationResult> {
  const steps: VerificationStep[] = [];

  try {
    // Resolve the primary signature (supports both old `sig` and new `sigs` format)
    const sig = getPrimarySig(claim);

    // Step 1: Validate claim structure
    if (!sig?.src || !sig?.attestation || !sig?.signedAt) {
      steps.push({
        step: "validate_claim",
        success: false,
        error: "Missing signature fields",
      });
      return buildResult(uri, rkey, claim, false, steps, "Missing signature fields");
    }
    steps.push({ step: "validate_claim", success: true, detail: "Claim structure valid" });

    // Step 2: Validate signing key is from a trusted signer
    const signerDid = extractDidFromAtUri(sig.src);
    if (!signerDid || !trustedDids.has(signerDid)) {
      const error = `Signing key is not from a trusted signer (source: ${sig.src})`;
      steps.push({ step: "validate_signer", success: false, error });
      return buildResult(uri, rkey, claim, false, steps, error);
    }
    steps.push({ step: "validate_signer", success: true, detail: `Signing key from trusted signer (${signerDid})` });

    // Step 3: Fetch the signing key
    let keyRecord: KeyRecord;
    try {
      keyRecord = await getRecordByUri<KeyRecord>(sig.src, options);
      steps.push({ step: "fetch_key", success: true, detail: `Fetched key from ${sig.src}` });
    } catch (err) {
      const error = `Failed to fetch signing key: ${err instanceof Error ? err.message : String(err)}`;
      steps.push({ step: "fetch_key", success: false, error });
      return buildResult(uri, rkey, claim, false, steps, error);
    }

    // Step 4: Parse the public JWK
    let publicJwk: ES256PublicJwk;
    try {
      publicJwk = JSON.parse(keyRecord.publicJwk) as ES256PublicJwk;
      if (publicJwk.kty !== "EC" || publicJwk.crv !== "P-256") {
        throw new Error("Invalid key type");
      }
      steps.push({ step: "parse_key", success: true, detail: "Parsed ES256 public key" });
    } catch (err) {
      const error = `Invalid public key format: ${err instanceof Error ? err.message : String(err)}`;
      steps.push({ step: "parse_key", success: false, error });
      return buildResult(uri, rkey, claim, false, steps, error);
    }

    // Step 5: Reconstruct the signed claim data.
    // Use signedFields to determine which fields were signed and reconstruct them.
    const fields = sig.signedFields ?? [];
    const isNewFormat = fields.includes("identity.subject");
    let signedData: SignedClaimData;
    if (isNewFormat) {
      // New format: signedFields tells us exactly which fields to include.
      // Map each field name to its value from the record.
      const valueMap: Record<string, string> = {
        claimUri: claim.claimUri,
        createdAt: sig.signedAt, // createdAt was set to signedAt during attestation
        did,
        "identity.subject": claim.identity.subject,
        type: claim.type,
      };
      signedData = {};
      for (const field of fields) {
        if (field in valueMap) {
          signedData[field] = valueMap[field];
        }
      }
    } else {
      // Legacy format: { did, subject, type, verifiedAt }
      signedData = {
        did,
        subject: claim.identity.subject,
        type: claim.type,
        verifiedAt: sig.signedAt,
      };
    }
    steps.push({
      step: "reconstruct_data",
      success: true,
      detail: `Reconstructed signed data for ${claim.type}:${claim.identity.subject} (${isNewFormat ? "new" : "legacy"} format)`,
    });

    // Step 6: Verify the signature
    const isValid = await verifyES256Signature(signedData, sig.attestation, publicJwk);

    if (isValid) {
      steps.push({ step: "verify_signature", success: true, detail: "Signature verified" });
      return buildResult(uri, rkey, claim, true, steps);
    } else {
      steps.push({ step: "verify_signature", success: false, error: "Signature verification failed" });
      return buildResult(uri, rkey, claim, false, steps, "Signature verification failed");
    }
  } catch (err) {
    const error = `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
    steps.push({ step: "unknown", success: false, error });
    return buildResult(uri, rkey, claim, false, steps, error);
  }
}

/**
 * Build a claim verification result.
 */
function buildResult(uri: string, rkey: string, claim: ClaimRecord, verified: boolean, steps: VerificationStep[], error?: string): ClaimVerificationResult {
  return {
    uri,
    rkey,
    type: claim.type,
    claimUri: claim.claimUri,
    verified,
    steps,
    error,
    identity: claim.identity,
    claim,
  };
}

/**
 * Extract the DID from an AT URI (at://did/collection/rkey)
 */
function extractDidFromAtUri(atUri: string): string | null {
  const match = atUri.match(/^at:\/\/([^/]+)\//);
  return match?.[1] ?? null;
}

/**
 * Resolve an array of handles to their DIDs.
 */
async function resolveTrustedDids(handles: string[], options?: VerifyOptions): Promise<Set<string>> {
  const dids = new Set<string>();
  await Promise.all(
    handles.map(async (handle) => {
      try {
        const did = await resolveHandle(handle, options);
        dids.add(did);
      } catch {
        // Skip handles that fail to resolve
      }
    }),
  );
  return dids;
}
