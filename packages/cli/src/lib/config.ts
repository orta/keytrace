import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

export interface StoredKey {
  /** rkey of the dev.keytrace.userPublicKey record */
  rkey: string;
  /** Full AT URI: at://did/dev.keytrace.userPublicKey/rkey */
  atUri: string;
  keyType: "pgp" | "ssh-ed25519" | "ssh-ecdsa";
  fingerprint: string;
  label: string;
  /** For SSH keys: absolute path to the private key file */
  keyFile?: string;
  /** For PGP keys: long key ID for gpg */
  pgpKeyId?: string;
}

export interface Config {
  handle: string;
  did: string;
  pdsUrl: string;
  accessJwt: string;
  refreshJwt: string;
  keys: StoredKey[];
}

const CONFIG_DIR = join(homedir(), ".keytrace");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<Config | null> {
  if (!existsSync(CONFIG_FILE)) return null;
  const data = await readFile(CONFIG_FILE, "utf-8");
  return JSON.parse(data) as Config;
}

export async function saveConfig(config: Config): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function configDir(): string {
  return CONFIG_DIR;
}
