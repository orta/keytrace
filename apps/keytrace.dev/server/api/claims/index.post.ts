/**
 * POST /api/claims
 *
 * Create a new identity claim record in the authenticated user's ATProto repo.
 * Requires authentication. Body: { claimUri: string, comment?: string }
 */

import { COLLECTION_NSID, serviceProviders, createClaim, verifyClaim, ClaimStatus } from "@keytrace/runner";
import { getSessionAgent } from "~/server/utils/session";
import { createAttestation, createStatusAttestation } from "~/server/utils/attestation";
import { addRecentClaim } from "~/server/utils/recent-claims";

export default defineEventHandler(async (event) => {
  const { did, agent } = await getSessionAgent(event);

  const body = await readBody<{
    claimUri?: string;
    comment?: string;
  }>(event);

  if (!body?.claimUri || typeof body.claimUri !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing claimUri" });
  }

  // Validate that the URI matches a known service provider
  const matches = serviceProviders.matchUri(body.claimUri);
  if (matches.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Claim URI does not match any known service provider",
    });
  }

  // Verify the claim first to ensure it's valid and extract identity metadata
  console.log(`[claims] Verifying claim: uri=${body.claimUri} did=${did}`);
  const claim = createClaim(body.claimUri, did);
  const verifyResult = await verifyClaim(claim, { timeout: 10_000 });

  if (verifyResult.status !== ClaimStatus.VERIFIED) {
    console.log(`[claims] Verification failed: ${verifyResult.errors.join(", ")}`);
    throw createError({
      statusCode: 400,
      statusMessage: `Claim verification failed: ${verifyResult.errors.join(", ") || "Could not verify ownership"}`,
    });
  }

  // Get the matched provider
  const { provider, match } = matches[0];
  const processed = provider.processURI(body.claimUri, match);

  // Use identity from verification result, falling back to processed profile
  const verifiedIdentity = verifyResult.identity;
  const subject = verifiedIdentity?.subject ?? processed.profile.display.replace(/^@/, "");

  // Create cryptographic attestation
  const attestation = await createAttestation(did, provider.id, subject, body.claimUri);

  // Build the signature object per dev.keytrace.signature lexicon
  const sig = {
    kid: "attest:" + provider.id,
    src: attestation.signingKey.uri,
    signedAt: attestation.signedAt,
    attestation: attestation.sig,
    signedFields: attestation.signedFields,
  };

  // Build the identity object per dev.keytrace.claim#identity lexicon
  const identity: {
    subject: string;
    avatarUrl?: string;
    profileUrl?: string;
    displayName?: string;
  } = {
    subject,
    avatarUrl: verifiedIdentity?.avatarUrl,
    profileUrl: verifiedIdentity?.profileUrl ?? processed.profile.uri,
    displayName: verifiedIdentity?.displayName,
  };

  try {
    const now = new Date().toISOString();

    // Create a status sig attesting the initial "verified" status
    const statusAttestation = await createStatusAttestation(did, body.claimUri, "verified", now);
    const statusSig = {
      kid: "status",
      src: statusAttestation.signingKey.uri,
      signedAt: statusAttestation.signedAt,
      attestation: statusAttestation.sig,
      signedFields: statusAttestation.signedFields,
    };

    const record = {
      $type: COLLECTION_NSID,
      type: provider.id,
      claimUri: body.claimUri,
      identity,
      sigs: [sig, statusSig],
      comment: body.comment,
      status: "verified",
      lastVerifiedAt: now,
      createdAt: now,
      prerelease: true,
    };

    console.log(`[claims] Creating record: repo=${did} collection=${COLLECTION_NSID}`);
    console.log(`[claims] Record:`, JSON.stringify(record));

    const result = await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: COLLECTION_NSID,
      record,
    });

    console.log(`[claims] Success: uri=${result.data.uri} cid=${result.data.cid}`);

    // Add to recent claims feed (best-effort, don't fail the request)
    try {
      const profile = await agent.getProfile({ actor: did }).catch(() => null);
      await addRecentClaim({
        did,
        handle: profile?.data.handle ?? did,
        avatar: profile?.data.avatar,
        type: provider.id,
        subject,
        displayName: identity.displayName ?? provider.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        createdAt: record.createdAt,
        identity: {
          subject,
          avatarUrl: identity.avatarUrl,
          profileUrl: identity.profileUrl,
          displayName: identity.displayName,
        },
      });
    } catch (error) {
      console.error("[claims] Failed to update recent claims feed:", error);
    }

    return {
      uri: result.data.uri,
      cid: result.data.cid,
      record,
    };
  } catch (err: unknown) {
    console.error(`[claims] Failed to create claim record:`, err);
    if (err && typeof err === "object" && "status" in err) {
      console.error(`[claims] HTTP status: ${(err as any).status}`);
    }
    if (err && typeof err === "object" && "headers" in err) {
      const wwwAuth = (err as any).headers?.get?.("www-authenticate") ?? (err as any).headers?.["www-authenticate"];
      if (wwwAuth) console.error(`[claims] WWW-Authenticate: ${wwwAuth}`);
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create claim record",
    });
  }
});
