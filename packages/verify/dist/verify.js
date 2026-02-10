import { resolveHandle, resolvePds, listClaimRecords, getRecordByUri } from "./atproto.js";
import { verifyES256Signature } from "./crypto/signature.js";
/**
 * Verify all keytrace claims for a handle.
 *
 * @param handle The ATProto handle (e.g., "alice.bsky.social") or DID
 * @param options Optional configuration
 * @returns Verification results for all claims
 */
export async function verifyClaims(handle, options) {
    const did = await resolveHandle(handle, options);
    const result = await verifyClaimsOnDid(did, options);
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
export async function verifyClaimsOnDid(did, options) {
    // Resolve PDS for the user
    const pdsUrl = await resolvePds(did, options);
    // Fetch all claim records
    let claimRecords;
    try {
        claimRecords = await listClaimRecords(pdsUrl, did, options);
    }
    catch {
        // No claims found
        return {
            did,
            claims: [],
            summary: { total: 0, verified: 0, failed: 0 },
        };
    }
    // Verify each claim
    const claimResults = [];
    for (const record of claimRecords) {
        const result = await verifySingleClaim(did, record.uri, record.rkey, record.value, options);
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
async function verifySingleClaim(did, uri, rkey, claim, options) {
    const steps = [];
    try {
        // Step 1: Validate claim structure
        if (!claim.sig?.src || !claim.sig?.attestation || !claim.sig?.signedAt) {
            steps.push({
                step: "validate_claim",
                success: false,
                error: "Missing signature fields",
            });
            return buildResult(uri, rkey, claim, false, steps, "Missing signature fields");
        }
        steps.push({ step: "validate_claim", success: true, detail: "Claim structure valid" });
        // Step 2: Fetch the signing key
        let keyRecord;
        try {
            keyRecord = await getRecordByUri(claim.sig.src, options);
            steps.push({ step: "fetch_key", success: true, detail: `Fetched key from ${claim.sig.src}` });
        }
        catch (err) {
            const error = `Failed to fetch signing key: ${err instanceof Error ? err.message : String(err)}`;
            steps.push({ step: "fetch_key", success: false, error });
            return buildResult(uri, rkey, claim, false, steps, error);
        }
        // Step 3: Parse the public JWK
        let publicJwk;
        try {
            publicJwk = JSON.parse(keyRecord.publicJwk);
            if (publicJwk.kty !== "EC" || publicJwk.crv !== "P-256") {
                throw new Error("Invalid key type");
            }
            steps.push({ step: "parse_key", success: true, detail: "Parsed ES256 public key" });
        }
        catch (err) {
            const error = `Invalid public key format: ${err instanceof Error ? err.message : String(err)}`;
            steps.push({ step: "parse_key", success: false, error });
            return buildResult(uri, rkey, claim, false, steps, error);
        }
        // Step 4: Reconstruct the signed claim data
        const signedData = {
            did,
            subject: claim.identity.subject,
            type: claim.type,
            verifiedAt: claim.sig.signedAt,
        };
        steps.push({
            step: "reconstruct_data",
            success: true,
            detail: `Reconstructed signed data for ${claim.type}:${claim.identity.subject}`,
        });
        // Step 5: Verify the signature
        const isValid = await verifyES256Signature(signedData, claim.sig.attestation, publicJwk);
        if (isValid) {
            steps.push({ step: "verify_signature", success: true, detail: "Signature verified" });
            return buildResult(uri, rkey, claim, true, steps);
        }
        else {
            steps.push({ step: "verify_signature", success: false, error: "Signature verification failed" });
            return buildResult(uri, rkey, claim, false, steps, "Signature verification failed");
        }
    }
    catch (err) {
        const error = `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
        steps.push({ step: "unknown", success: false, error });
        return buildResult(uri, rkey, claim, false, steps, error);
    }
}
/**
 * Build a claim verification result.
 */
function buildResult(uri, rkey, claim, verified, steps, error) {
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
//# sourceMappingURL=verify.js.map