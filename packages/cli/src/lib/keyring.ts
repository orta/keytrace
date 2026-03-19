import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

export interface FoundKey {
  keyType: "pgp" | "ssh-ed25519" | "ssh-ecdsa";
  publicKeyArmored: string;
  fingerprint: string;
  label: string;
  /** Absolute path to the SSH private key file (SSH keys only) */
  keyFile?: string;
  /** GPG long key ID (PGP keys only) */
  pgpKeyId?: string;
}

/**
 * Discover SSH public keys in ~/.ssh/ that have a corresponding private key
 * and are of a type we support signing with (ed25519 or ecdsa).
 */
export async function findSshKeys(): Promise<FoundKey[]> {
  const sshDir = join(homedir(), ".ssh");
  if (!existsSync(sshDir)) return [];

  let files: string[];
  try {
    files = await readdir(sshDir);
  } catch {
    return [];
  }

  const pubFiles = files.filter((f) => f.endsWith(".pub"));
  const keys: FoundKey[] = [];

  for (const pubFile of pubFiles) {
    const pubPath = join(sshDir, pubFile);
    const content = await readFile(pubPath, "utf-8").catch(() => null);
    if (!content) continue;

    const firstLine = content.trim().split("\n")[0];
    const parts = firstLine.split(" ");
    const rawType = parts[0];

    let keyType: "ssh-ed25519" | "ssh-ecdsa" | null = null;
    if (rawType === "ssh-ed25519") keyType = "ssh-ed25519";
    else if (rawType === "ecdsa-sha2-nistp256" || rawType === "ecdsa-sha2-nistp384" || rawType === "ecdsa-sha2-nistp521")
      keyType = "ssh-ecdsa";
    else continue;

    const privateKeyPath = join(sshDir, pubFile.replace(/\.pub$/, ""));
    if (!existsSync(privateKeyPath)) continue;

    try {
      const fpOut = execSync(`ssh-keygen -lf "${pubPath}"`, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      // Output: "256 SHA256:xxxxx comment (ED25519)"
      const fingerprint = fpOut.trim().split(/\s+/)[1] ?? pubFile;

      keys.push({
        keyType,
        publicKeyArmored: content.trim(),
        fingerprint,
        label: pubFile.replace(/\.pub$/, ""),
        keyFile: privateKeyPath,
      });
    } catch {
      // skip if ssh-keygen unavailable or key unreadable
    }
  }

  return keys;
}

/**
 * Discover PGP secret keys in the local gpg keyring.
 */
export async function findPgpKeys(): Promise<FoundKey[]> {
  try {
    const raw = execSync("gpg --list-secret-keys --with-colons 2>/dev/null", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    const keys: FoundKey[] = [];
    const lines = raw.split("\n");
    let currentKeyId: string | null = null;
    let seenUid = false;

    for (const line of lines) {
      const cols = line.split(":");
      const recordType = cols[0];

      if (recordType === "sec") {
        currentKeyId = cols[4] ?? null; // long key ID
        seenUid = false;
      } else if (recordType === "uid" && currentKeyId && !seenUid) {
        seenUid = true;
        const uid = cols[9] ?? currentKeyId;

        try {
          const pubKey = execSync(`gpg --armor --export ${currentKeyId}`, {
            encoding: "utf-8",
          });

          const fpRaw = execSync(
            `gpg --fingerprint --with-colons ${currentKeyId}`,
            { encoding: "utf-8" },
          );
          // fpr line: "fpr:::::::::FINGERPRINT:"
          const fprLine = fpRaw.split("\n").find((l) => l.startsWith("fpr:"));
          const fingerprint = fprLine?.split(":")?.[9] ?? currentKeyId;

          keys.push({
            keyType: "pgp",
            publicKeyArmored: pubKey.trim(),
            fingerprint: fingerprint.slice(-16),
            label: uid,
            pgpKeyId: currentKeyId,
          });
        } catch {
          // skip if export fails
        }
      }
    }

    return keys;
  } catch {
    return []; // gpg not installed or no keys
  }
}

export async function findAllKeys(): Promise<FoundKey[]> {
  const [ssh, pgp] = await Promise.all([findSshKeys(), findPgpKeys()]);
  return [...ssh, ...pgp];
}
