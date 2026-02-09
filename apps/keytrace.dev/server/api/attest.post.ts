import { getSessionAgent } from "../utils/session";
import { createAttestation, buildClaimRecord } from "../utils/attestation";
import { addRecentClaim } from "../utils/recent-claims";
import { getKeytraceAgent } from "../utils/keytrace-agent";

/**
 * POST /api/attest
 *
 * Creates a signed attestation for a verified claim and writes it to the user's ATProto repo.
 *
 * Body: { type: string, subject: string, recipeId: string }
 *   - type: claim type identifier (e.g., "github-gist")
 *   - subject: the claimed identity (e.g., "github:octocat")
 *   - recipeId: recipe record key (e.g., "github-gist")
 *
 * Requires authentication. Returns the created record URI and attestation.
 */
export default defineEventHandler(async (event) => {
  const { did, agent } = await getSessionAgent(event);

  const body = await readBody(event);
  if (!body?.type || !body?.subject || !body?.recipeId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields: type, subject, recipeId",
    });
  }

  const { type, subject, recipeId } = body as {
    type: string;
    subject: string;
    recipeId: string;
  };

  // Get the recipe strong ref from keytrace's repo
  const config = useRuntimeConfig();
  const keytraceAgent = await getKeytraceAgent();
  let recipeRef: { uri: string; cid: string };
  try {
    const recipeRecord = await keytraceAgent.com.atproto.repo.getRecord({
      repo: config.keytraceDid,
      collection: "dev.keytrace.recipe",
      rkey: recipeId,
    });
    recipeRef = {
      uri: recipeRecord.data.uri,
      cid: recipeRecord.data.cid!,
    };
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: `Recipe not found: ${recipeId}`,
    });
  }

  // Create the attestation (signs with today's key)
  const attestation = await createAttestation(did, type, subject);

  // Build the full claim record
  const record = buildClaimRecord(type, subject, recipeRef, attestation);

  // Write to the user's ATProto repo
  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: "dev.keytrace.claim",
    record,
  });

  // Add to recent claims feed (best-effort, don't fail the request)
  try {
    const profile = await agent.getProfile({ actor: did }).catch(() => null);
    await addRecentClaim({
      did,
      handle: profile?.data.handle ?? did,
      avatar: profile?.data.avatar,
      type,
      subject,
      displayName: type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[attest] Failed to update recent claims feed:", error);
  }

  return {
    uri: response.data.uri,
    cid: response.data.cid,
    attestation,
  };
});
