import { getOrCreateTodaysKey, getTodaysKeyRef } from "./keys"
import { signClaim, canonicalize } from "./signing"

export interface ClaimData {
  type: string
  subject: string
  did: string
  verifiedAt: string
}

export interface Attestation {
  sig: string
  signingKey: { uri: string; cid: string }
  signedAt: string
}

export interface ClaimRecord {
  $type: "dev.keytrace.claim"
  type: string
  subject: string
  recipe: { uri: string; cid: string }
  attestation: Attestation
  createdAt: string
}

/**
 * Create a cryptographic attestation for a verified claim.
 *
 * 1. Gets today's signing key
 * 2. Builds canonical claim data
 * 3. Signs with ES256
 * 4. Returns the attestation (sig + key ref + timestamp)
 */
export async function createAttestation(
  did: string,
  type: string,
  subject: string,
): Promise<Attestation> {
  const keyPair = await getOrCreateTodaysKey()
  const now = new Date().toISOString()

  const claimData: ClaimData = {
    did,
    subject,
    type,
    verifiedAt: now,
  }

  const sig = signClaim(claimData, keyPair.privateKey)
  const keyRef = await getTodaysKeyRef()

  return {
    sig,
    signingKey: keyRef,
    signedAt: now,
  }
}

/**
 * Build a complete dev.keytrace.claim record ready to write to a user's ATProto repo.
 */
export function buildClaimRecord(
  type: string,
  subject: string,
  recipeRef: { uri: string; cid: string },
  attestation: Attestation,
): ClaimRecord {
  return {
    $type: "dev.keytrace.claim",
    type,
    subject,
    recipe: recipeRef,
    attestation,
    createdAt: new Date().toISOString(),
  }
}
