/**
 * LinkedClaims integration utilities.
 *
 * Creates and updates com.linkedclaims.claim records alongside keytrace claims.
 * The linkedclaim uses the same rkey as the corresponding keytrace claim so we
 * can always derive its AT-URI without storing a back-reference.
 *
 * https://identity.foundation/labs-linkedclaims/
 */

import { createHash } from "node:crypto";
import { getKeytraceAgent } from "~/server/utils/keytrace-agent";

const LINKED_CLAIMS_NSID = "com.linkedclaims.claim";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function toBase58(bytes: Uint8Array): string {
  let num = BigInt("0x" + Buffer.from(bytes).toString("hex"));
  let result = "";
  while (num > 0n) {
    result = BASE58_ALPHABET[Number(num % 58n)] + result;
    num /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    result = "1" + result;
  }
  return result;
}

/**
 * Compute a multibase base58btc-encoded SHA-256 multihash of the given data.
 * Format: "z" + base58btc(0x12 + 0x20 + sha256(data))
 * This is the digestMultibase format used by LinkedClaims.
 */
function computeDigestMultibase(data: string): string {
  const digest = createHash("sha256").update(data, "utf8").digest();
  // SHA-256 multihash prefix: 0x12 (sha2-256) + 0x20 (32 bytes)
  const multihash = new Uint8Array([0x12, 0x20, ...digest]);
  return "z" + toBase58(multihash);
}

// Map keytrace provider IDs to LinkedClaims howKnown values; defaults to WEB_DOCUMENT
const HOW_KNOWN: Record<string, string> = {
  pgp: "SIGNED_DOCUMENT",
};

interface PutLinkedClaimOptions {
  rkey: string;
  /** AT-URI of the keytrace dev.keytrace.claim record */
  keytraceAtUri: string;
  /** The keytrace claim record content — hashed to produce source.digestMultibase */
  keytraceRecord: Record<string, unknown>;
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

export async function putLinkedClaim(opts: PutLinkedClaimOptions) {
  const { rkey, keytraceAtUri, keytraceRecord, subjectUri, providerId, subjectLabel, confidence, statusAt, createdAt } = opts;

  const agent = await getKeytraceAgent();
  const did = agent.session?.did;
  if (!did) throw new Error("Keytrace agent has no active session");

  const howKnown = HOW_KNOWN[providerId] ?? "WEB_DOCUMENT";
  const digestMultibase = computeDigestMultibase(JSON.stringify(keytraceRecord));

  const record: Record<string, unknown> = {
    $type: LINKED_CLAIMS_NSID,
    subject: subjectUri,
    claimType: "identity",
    statement: `Verified ${providerId} identity: ${subjectLabel}`,
    confidence,
    source: {
      uri: keytraceAtUri,
      digestMultibase,
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
