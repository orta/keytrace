import { getOrCreateTodaysKey, getTodaysKeyRef } from "./keys";
import { signClaim, canonicalize } from "./signing";

export interface ClaimData {
  claimUri: string;
  did: string;
  "identity.subject": string;
  type: string;
}

export interface Attestation {
  sig: string;
  signingKey: { uri: string; cid: string };
  signedAt: string;
  signedFields: string[];
}

export interface ClaimRecord {
  $type: "dev.keytrace.claim";
  type: string;
  subject: string;
  recipe: { uri: string; cid: string };
  attestation: Attestation;
  createdAt: string;
}

/**
 * Create a cryptographic attestation for a verified claim.
 *
 * 1. Gets today's signing key
 * 2. Builds canonical claim data
 * 3. Signs with ES256
 * 4. Returns the attestation (sig + key ref + timestamp)
 */
export async function createAttestation(did: string, type: string, subject: string, claimUri: string): Promise<Attestation> {
  const keyPair = await getOrCreateTodaysKey();
  const now = new Date().toISOString();

  const claimData: ClaimData = {
    claimUri,
    did,
    "identity.subject": subject,
    type,
  };

  const sig = signClaim(claimData as unknown as Record<string, unknown>, keyPair.privateKey);
  const keyRef = await getTodaysKeyRef();

  return {
    sig,
    signingKey: keyRef,
    signedAt: now,
    signedFields: Object.keys(claimData).sort(),
  };
}

/**
 * Create a cryptographic attestation for a status change (re-verification or retraction).
 * Signs over { claimUri, did, status, <timestampField> } so the status fields can't be tampered with.
 * The timestamp field name matches the record field: lastVerifiedAt, failedAt, or retractedAt.
 */
export async function createStatusAttestation(
  did: string,
  claimUri: string,
  status: string,
  statusAt: string,
): Promise<Attestation> {
  const keyPair = await getOrCreateTodaysKey();

  // Use the actual record field name for the timestamp so signedFields maps directly to record fields
  const timestampField =
    status === "verified" ? "lastVerifiedAt" : status === "retracted" ? "retractedAt" : "failedAt";

  const claimData: Record<string, string> = {
    claimUri,
    did,
    status,
    [timestampField]: statusAt,
  };

  const sig = signClaim(claimData, keyPair.privateKey);
  const keyRef = await getTodaysKeyRef();

  return {
    sig,
    signingKey: keyRef,
    signedAt: statusAt,
    signedFields: Object.keys(claimData).sort(),
  };
}

/**
 * Build a complete dev.keytrace.claim record ready to write to a user's ATProto repo.
 */
export function buildClaimRecord(type: string, subject: string, recipeRef: { uri: string; cid: string }, attestation: Attestation): ClaimRecord {
  return {
    $type: "dev.keytrace.claim",
    type,
    subject,
    recipe: recipeRef,
    attestation,
    createdAt: new Date().toISOString(),
  };
}
