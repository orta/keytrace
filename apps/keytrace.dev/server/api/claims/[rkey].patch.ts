/**
 * PATCH /api/claims/:rkey
 *
 * Update claim status via re-verification or retraction.
 * Requires authentication. Body: { action: "reverify" | "retract" }
 */

import { COLLECTION_NSID, createClaim, verifyClaim, ClaimStatus } from "@keytrace/runner";
import { getSessionAgent } from "~/server/utils/session";
import { createStatusAttestation } from "~/server/utils/attestation";

export default defineEventHandler(async (event) => {
  const { did, agent } = await getSessionAgent(event);

  const rkey = getRouterParam(event, "rkey");
  if (!rkey) {
    throw createError({ statusCode: 400, statusMessage: "Missing rkey parameter" });
  }

  if (!/^[a-zA-Z0-9._~-]+$/.test(rkey)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid rkey format" });
  }

  const body = await readBody<{ action?: string }>(event);
  if (!body?.action || !["reverify", "retract"].includes(body.action)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid action. Must be "reverify" or "retract".' });
  }

  // Fetch existing record
  let existing: any;
  try {
    const res = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: COLLECTION_NSID,
      rkey,
    });
    existing = res.data;
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Claim record not found" });
  }

  const record = { ...existing.value } as Record<string, any>;
  const now = new Date().toISOString();

  const claimUri = record.claimUri;
  if (!claimUri) {
    throw createError({ statusCode: 400, statusMessage: "Record has no claimUri" });
  }

  if (body.action === "retract") {
    record.status = "retracted";
    record.failedAt = now;
  } else {
    // reverify: re-run verification against the claim URI
    console.log(`[claims] Re-verifying claim: rkey=${rkey} uri=${claimUri} did=${did}`);
    const claim = createClaim(claimUri, did);
    const result = await verifyClaim(claim, { timeout: 10_000 });

    if (result.status === ClaimStatus.VERIFIED) {
      record.status = "verified";
      record.lastVerifiedAt = now;
    } else {
      record.status = "failed";
      record.failedAt = now;
      console.log(`[claims] Re-verification failed: ${result.errors.join(", ")}`);
    }
  }

  // Sign over the status fields so they can't be tampered with
  const statusAt = record.status === "verified" ? record.lastVerifiedAt : record.failedAt;
  const statusAttestation = await createStatusAttestation(did, claimUri, record.status, statusAt);
  record.statusSig = {
    kid: new Date().toISOString().split("T")[0],
    src: statusAttestation.signingKey.uri,
    signedAt: statusAttestation.signedAt,
    attestation: statusAttestation.sig,
    signedFields: statusAttestation.signedFields,
  };

  try {
    const res = await agent.com.atproto.repo.putRecord({
      repo: did,
      collection: COLLECTION_NSID,
      rkey,
      record,
    });

    return {
      uri: res.data.uri,
      cid: res.data.cid,
      status: record.status,
      lastVerifiedAt: record.lastVerifiedAt,
      failedAt: record.failedAt,
    };
  } catch (err: unknown) {
    console.error(`[claims] Failed to update claim record:`, err);

    // Detect revoked app access or expired tokens
    const status = (err as any)?.status ?? (err as any)?.statusCode;
    if (status === 401 || status === 403) {
      throw createError({
        statusCode: 403,
        statusMessage: "App access has been revoked. Please re-authorize keytrace from your Bluesky settings.",
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to update claim record",
    });
  }
});
