import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecordEvent } from "@atproto/tap";
import type { ClaimRecord, ClaimVerificationResult } from "@keytrace/claims";
import { openReverseLookupDb, type ReverseLookupDb } from "../reverse-lookup-db";
import { handleClaimEvent } from "../reverse-lookup-handler";

function makeClaim(overrides: Partial<ClaimRecord> = {}): ClaimRecord {
  return {
    $type: "dev.keytrace.claim",
    type: "github",
    claimUri: "https://gist.github.com/alice/abc",
    identity: { subject: "alice" },
    createdAt: "2026-03-01T00:00:00.000Z",
    sigs: [],
    ...overrides,
  };
}

function event(action: RecordEvent["action"], did: string, rkey: string, record?: ClaimRecord): RecordEvent {
  return {
    id: 0,
    type: "record",
    action,
    did,
    rev: "",
    collection: "dev.keytrace.claim",
    rkey,
    record: record as unknown as RecordEvent["record"],
    live: true,
  } as RecordEvent;
}

function mkResult(overrides: Partial<ClaimVerificationResult>): ClaimVerificationResult {
  return {
    uri: "",
    rkey: "",
    type: "",
    claimUri: "",
    steps: [],
    identity: { subject: "" },
    claim: {} as ClaimRecord,
    verified: false,
    ...overrides,
  };
}

const DID_A = "did:plc:aaaaaaaaaaaaaaaaaaaaa";
const DID_B = "did:plc:bbbbbbbbbbbbbbbbbbbbb";
const verified = vi.fn(async () => mkResult({ verified: true }));
const unverified = vi.fn(async () => mkResult({ verified: false, failureKind: "terminal" }));
const transientFailure = vi.fn(async () => mkResult({ verified: false, failureKind: "transient" }));

describe("reverse lookup", () => {
  let db: ReverseLookupDb;

  beforeEach(() => {
    db = openReverseLookupDb(":memory:");
    verified.mockClear();
    unverified.mockClear();
    transientFailure.mockClear();
  });

  afterEach(() => db.close());

  it("indexes a verified claim so it can be found by (type, subject)", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim()), db, verified);

    expect(db.find("github", "alice")).toEqual([expect.objectContaining({ did: DID_A, rkey: "rkey1", type: "github", subject: "alice", recheckSuggested: false })]);
  });

  it("ignores claims whose signature does not verify", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim()), db, unverified);

    expect(db.find("github", "alice")).toEqual([]);
  });

  it("ignores retracted claims even when otherwise valid", async () => {
    const retracted = makeClaim({
      status: "retracted",
      retractedAt: "2026-03-02T00:00:00.000Z",
    } as Partial<ClaimRecord>);

    await handleClaimEvent(event("create", DID_A, "rkey1", retracted), db, verified);

    expect(db.find("github", "alice")).toEqual([]);
    expect(verified).not.toHaveBeenCalled();
  });

  it("ignores claims whose status is 'failed'", async () => {
    const failed = makeClaim({ status: "failed" } as Partial<ClaimRecord>);

    await handleClaimEvent(event("create", DID_A, "rkey1", failed), db, verified);

    expect(db.find("github", "alice")).toEqual([]);
  });

  it("removes a previously-indexed claim when an update marks it retracted", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim()), db, verified);
    expect(db.find("github", "alice")).toHaveLength(1);

    const retracted = makeClaim({ status: "retracted", retractedAt: "2026-03-02T00:00:00.000Z" } as Partial<ClaimRecord>);
    await handleClaimEvent(event("update", DID_A, "rkey1", retracted), db, verified);

    expect(db.find("github", "alice")).toEqual([]);
  });

  it("keeps an existing entry and flags it for recheck on a transient verify failure", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim()), db, verified);
    expect(db.find("github", "alice")[0]?.recheckSuggested).toBe(false);

    await handleClaimEvent(event("update", DID_A, "rkey1", makeClaim()), db, transientFailure);

    const [row] = db.find("github", "alice");
    expect(row?.recheckSuggested).toBe(true);
  });

  it("clears the recheck flag once a subsequent verification succeeds", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim()), db, verified);
    await handleClaimEvent(event("update", DID_A, "rkey1", makeClaim()), db, transientFailure);
    expect(db.find("github", "alice")[0]?.recheckSuggested).toBe(true);

    await handleClaimEvent(event("update", DID_A, "rkey1", makeClaim()), db, verified);

    expect(db.find("github", "alice")[0]?.recheckSuggested).toBe(false);
  });

  it("does not index a new claim when verification hits a transient failure", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim()), db, transientFailure);

    expect(db.find("github", "alice")).toEqual([]);
  });

  it("removes an indexed claim when the record is deleted", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim()), db, verified);

    await handleClaimEvent(event("delete", DID_A, "rkey1"), db, verified);

    expect(db.find("github", "alice")).toEqual([]);
  });

  it("returns all DIDs claiming the same (type, subject)", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim()), db, verified);
    await handleClaimEvent(event("create", DID_B, "rkey2", makeClaim()), db, verified);

    const matches = db.find("github", "alice");
    expect(matches.map((m) => m.did).sort()).toEqual([DID_A, DID_B].sort());
  });

  it("matches subjects exactly (case-sensitive)", async () => {
    await handleClaimEvent(event("create", DID_A, "rkey1", makeClaim({ identity: { subject: "Alice" } })), db, verified);

    expect(db.find("github", "alice")).toEqual([]);
    expect(db.find("github", "Alice")).toHaveLength(1);
  });

  it("uses lastVerifiedAt when present, else createdAt, as verifiedAt", async () => {
    const withLastVerified = makeClaim({ lastVerifiedAt: "2026-04-01T00:00:00.000Z" } as Partial<ClaimRecord>);

    await handleClaimEvent(event("create", DID_A, "rkey1", withLastVerified), db, verified);
    await handleClaimEvent(event("create", DID_B, "rkey2", makeClaim()), db, verified);

    const found = db.find("github", "alice");
    expect(found.find((m) => m.did === DID_A)?.verifiedAt).toBe("2026-04-01T00:00:00.000Z");
    expect(found.find((m) => m.did === DID_B)?.verifiedAt).toBe("2026-03-01T00:00:00.000Z");
  });
});
