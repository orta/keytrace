import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DATA_DIR } from "./storage";

export interface ReverseLookupMatch {
  did: string;
  rkey: string;
  type: string;
  subject: string;
  verifiedAt: string;
  recheckSuggested: boolean;
}

export interface ReverseLookupDb {
  upsert(match: Omit<ReverseLookupMatch, "recheckSuggested">): void;
  markRecheckSuggested(did: string, rkey: string): void;
  remove(did: string, rkey: string): void;
  find(type: string, subject: string): ReverseLookupMatch[];
  close(): void;
  raw(): Database.Database;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS reverse_lookup (
    did TEXT NOT NULL,
    rkey TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    verified_at TEXT NOT NULL,
    recheck_suggested INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (did, rkey)
  );
  CREATE INDEX IF NOT EXISTS idx_reverse_lookup_type_subject
    ON reverse_lookup(type, subject);
`;

function migrate(db: Database.Database): void {
  const cols = db.prepare(`PRAGMA table_info(reverse_lookup)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "recheck_suggested")) {
    db.exec(`ALTER TABLE reverse_lookup ADD COLUMN recheck_suggested INTEGER NOT NULL DEFAULT 0`);
  }
}

export function openReverseLookupDb(filePath: string): ReverseLookupDb {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  migrate(db);

  const upsertStmt = db.prepare(`
    INSERT INTO reverse_lookup (did, rkey, type, subject, verified_at, recheck_suggested)
    VALUES (@did, @rkey, @type, @subject, @verifiedAt, 0)
    ON CONFLICT(did, rkey) DO UPDATE SET
      type = excluded.type,
      subject = excluded.subject,
      verified_at = excluded.verified_at,
      recheck_suggested = 0
  `);
  const markRecheckStmt = db.prepare(`UPDATE reverse_lookup SET recheck_suggested = 1 WHERE did = ? AND rkey = ?`);
  const removeStmt = db.prepare(`DELETE FROM reverse_lookup WHERE did = ? AND rkey = ?`);
  const findStmt = db.prepare(`
    SELECT did, rkey, type, subject,
           verified_at AS verifiedAt,
           recheck_suggested AS recheckSuggested
    FROM reverse_lookup
    WHERE type = ? AND subject = ?
    ORDER BY verified_at DESC
  `);

  return {
    upsert(match) {
      upsertStmt.run(match);
    },
    markRecheckSuggested(did, rkey) {
      markRecheckStmt.run(did, rkey);
    },
    remove(did, rkey) {
      removeStmt.run(did, rkey);
    },
    find(type, subject) {
      return (findStmt.all(type, subject) as Array<Omit<ReverseLookupMatch, "recheckSuggested"> & { recheckSuggested: number }>).map((r) => ({
        ...r,
        recheckSuggested: r.recheckSuggested === 1,
      }));
    },
    close() {
      db.close();
    },
    raw() {
      return db;
    },
  };
}

let _db: ReverseLookupDb | null = null;

export function getReverseLookupDb(): ReverseLookupDb {
  if (!_db) {
    const filePath = process.env.KEYTRACE_REVERSE_LOOKUP_DB || path.join(DATA_DIR, "reverse-lookup.sqlite");
    _db = openReverseLookupDb(filePath);
  }
  return _db;
}

export function resetReverseLookupDbForTests(): void {
  _db?.close();
  _db = null;
}
