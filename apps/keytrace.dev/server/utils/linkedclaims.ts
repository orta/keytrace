/**
 * LinkedClaims integration utilities.
 *
 * Creates and updates com.linkedclaims.claim records alongside keytrace claims.
 * The linkedclaim uses the same rkey as the corresponding keytrace claim so we
 * can always derive its AT-URI without storing a back-reference.
 *
 * https://identity.foundation/labs-linkedclaims/
 */

const LINKED_CLAIMS_NSID = "com.linkedclaims.claim";

// Map keytrace provider IDs to LinkedClaims howKnown values; defaults to WEB_DOCUMENT
const HOW_KNOWN: Record<string, string> = {
  pgp: "SIGNED_DOCUMENT",
};

interface PutLinkedClaimOptions {
  did: string;
  rkey: string;
  /** AT-URI of the keytrace dev.keytrace.claim record */
  keytraceAtUri: string;
  /** External identity URI (e.g. the GitHub profile URL) */
  subjectUri: string;
  providerId: string;
  /** Human-readable identity subject (e.g. "orta" or "@orta") */
  subjectLabel: string;
  confidence: number;
  /** ISO datetime of when the claim was verified / failed / retracted */
  statusAt: string;
  createdAt: string;
}

export async function putLinkedClaim(agent: any, opts: PutLinkedClaimOptions) {
  const { did, rkey, keytraceAtUri, subjectUri, providerId, subjectLabel, confidence, statusAt, createdAt } = opts;

  const howKnown = HOW_KNOWN[providerId] ?? "WEB_DOCUMENT";

  const record: Record<string, unknown> = {
    $type: LINKED_CLAIMS_NSID,
    subject: subjectUri,
    claimType: "identity",
    statement: `Verified ${providerId} identity: ${subjectLabel}`,
    confidence,
    source: {
      uri: keytraceAtUri,
      howKnown,
      dateObserved: statusAt,
    },
    effectiveDate: statusAt,
    createdAt,
  };

  await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: LINKED_CLAIMS_NSID,
    rkey,
    record,
  });
}
