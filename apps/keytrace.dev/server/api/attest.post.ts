import { getSessionAgent } from "../utils/session";
import { createAttestation, buildClaimRecord } from "../utils/attestation";
import { addRecentClaim } from "../utils/recent-claims";

/**
 * POST /api/attest
 *
 * Creates a signed attestation for a verified claim and writes it to the user's ATProto repo.
 *
 * Body: { type: string, subject: string }
 *   - type: claim type identifier (e.g., "github-gist")
 *   - subject: the claimed identity (e.g., "github:octocat")
 *
 * Requires authentication. Returns the created record URI and attestation.
 */
export default defineEventHandler(async (event) => {
  const { did, agent } = await getSessionAgent(event);

  const body = await readBody(event);
  if (!body?.type || !body?.subject) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required fields: type, subject",
    });
  }

  const { type, subject } = body as {
    type: string;
    subject: string;
  };

  // Create the attestation (signs with today's key)
  const attestation = await createAttestation(did, type, subject);

  // Build the full claim record
  const record = buildClaimRecord(type, subject, attestation);

  // Write to the user's ATProto repo
  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: "dev.keytrace.claim",
    record,
  });

  // Add to recent claims feed (best-effort, don't fail the request)
  try {
    const profile = await agent.getProfile({ actor: did }).catch(() => null);
    // Extract identity name from subject (e.g., "github:octocat" -> "octocat")
    const identityName = subject.includes(":") ? subject.split(":").pop() : subject;
    await addRecentClaim({
      did,
      handle: profile?.data.handle ?? did,
      avatar: profile?.data.avatar,
      type,
      subject,
      displayName: type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      createdAt: new Date().toISOString(),
      identity: {
        subject: identityName ?? subject,
        displayName: identityName,
      },
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
