import { execFileSync, execSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StoredKey } from "./config.js";

/**
 * Canonicalize an object for signing: sort keys recursively and JSON.stringify.
 */
function canonicalize(data: Record<string, unknown>): string {
  const sortKeys = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  };
  return JSON.stringify(sortKeys(data));
}

/**
 * Build the canonical payload that will be signed — the whole claim record
 * (excluding the selfSig field itself, which isn't known at signing time).
 */
export function buildSignablePayload(record: Record<string, unknown>): string {
  return canonicalize(record);
}

/**
 * Sign a payload with an SSH key using `ssh-keygen -Y sign`.
 * Returns the full SSH signature block (PEM-like format).
 *
 * Requires OpenSSH >= 8.0.
 */
export function signWithSsh(payload: string, keyFile: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tmpIn = join(tmpdir(), `kt-${id}.txt`);
  const tmpSig = `${tmpIn}.sig`;

  writeFileSync(tmpIn, payload, "utf-8");

  try {
    execFileSync("ssh-keygen", ["-Y", "sign", "-f", keyFile, "-n", "keytrace", "-m", tmpIn], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    return readFileSync(tmpSig, "utf-8").trim();
  } finally {
    try { unlinkSync(tmpIn); } catch { /* ok */ }
    try { unlinkSync(tmpSig); } catch { /* ok */ }
  }
}

/**
 * Sign a payload with a PGP key using gpg (via the gpg-agent for passphrase handling).
 * Returns an armored detached signature.
 */
export function signWithPgp(payload: string, pgpKeyId: string): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tmpIn = join(tmpdir(), `kt-${id}.txt`);
  const tmpSig = `${tmpIn}.asc`;

  writeFileSync(tmpIn, payload, "utf-8");

  try {
    execSync(
      `gpg --armor --detach-sign --local-user ${pgpKeyId} --output "${tmpSig}" "${tmpIn}"`,
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    return readFileSync(tmpSig, "utf-8").trim();
  } finally {
    try { unlinkSync(tmpIn); } catch { /* ok */ }
    try { unlinkSync(tmpSig); } catch { /* ok */ }
  }
}

/**
 * Sign the canonical claim record with the selected key.
 * Pass the full record object (without selfSig).
 * Returns the signature string to store in selfSig.sig.
 */
export function signClaim(
  record: Record<string, unknown>,
  key: Pick<StoredKey, "keyType" | "keyFile" | "pgpKeyId">,
): string {
  const payload = buildSignablePayload(record);

  if (key.keyType === "pgp") {
    if (!key.pgpKeyId) throw new Error("pgpKeyId required for PGP signing");
    return signWithPgp(payload, key.pgpKeyId);
  } else {
    if (!key.keyFile) throw new Error("keyFile required for SSH signing");
    return signWithSsh(payload, key.keyFile);
  }
}
