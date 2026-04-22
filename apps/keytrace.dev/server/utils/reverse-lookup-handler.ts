import type { RecordEvent } from "@atproto/tap";
import type { ClaimRecord, ClaimVerificationResult } from "@keytrace/claims";
import type { ReverseLookupDb } from "./reverse-lookup-db";

export type VerifyFn = (args: { did: string; uri: string; rkey: string; claim: ClaimRecord }) => Promise<ClaimVerificationResult>;

export function atUri(did: string, collection: string, rkey: string): string {
  return `at://${did}/${collection}/${rkey}`;
}

function isIndexable(claim: ClaimRecord): boolean {
  if (claim.retractedAt) return false;
  const status = (claim as ClaimRecord & { status?: string }).status;
  return status === undefined || status === "verified";
}

function verifiedAtFor(claim: ClaimRecord): string {
  const lastVerifiedAt = (claim as ClaimRecord & { lastVerifiedAt?: string }).lastVerifiedAt;
  return lastVerifiedAt ?? claim.createdAt;
}

export type HandlerOutcome = { kind: "indexed" } | { kind: "removed-deleted" } | { kind: "removed-retracted" } | { kind: "removed-terminal"; reason?: string } | { kind: "flagged-transient"; reason?: string };

export async function handleClaimEvent(evt: RecordEvent, db: ReverseLookupDb, verify: VerifyFn): Promise<HandlerOutcome> {
  const claim = evt.record as unknown as ClaimRecord | undefined;

  if (evt.action === "delete" || !claim) {
    db.remove(evt.did, evt.rkey);
    return { kind: "removed-deleted" };
  }

  if (!isIndexable(claim)) {
    db.remove(evt.did, evt.rkey);
    return { kind: "removed-retracted" };
  }

  const result = await verify({
    did: evt.did,
    uri: atUri(evt.did, evt.collection, evt.rkey),
    rkey: evt.rkey,
    claim,
  });

  if (result.verified) {
    db.upsert({
      did: evt.did,
      rkey: evt.rkey,
      type: claim.type,
      subject: claim.identity.subject,
      verifiedAt: verifiedAtFor(claim),
    });
    return { kind: "indexed" };
  }

  // On transient failures, keep any existing row (so a network blip doesn't
  // erase it) but flag it so consumers know the last check was inconclusive.
  // markRecheckSuggested is a no-op if no row exists yet.
  if (result.failureKind === "transient") {
    db.markRecheckSuggested(evt.did, evt.rkey);
    return { kind: "flagged-transient", reason: result.error };
  }

  db.remove(evt.did, evt.rkey);
  return { kind: "removed-terminal", reason: result.error };
}
