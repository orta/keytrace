import fs from "node:fs";
import path from "node:path";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { NodeSavedSession, NodeSavedSessionStore, NodeSavedState, NodeSavedStateStore } from "@atproto/oauth-client-node";

// --- Shared storage utilities ---

export const DATA_DIR = path.join(process.cwd(), ".data");

export function useS3(): boolean {
  return Boolean(useRuntimeConfig().s3Bucket);
}

function getS3Config() {
  const config = useRuntimeConfig();
  return {
    bucket: config.s3Bucket,
    region: config.s3Region || "fr-par",
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
    endpoint: config.s3Endpoint,
  };
}

let _s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_s3Client) {
    const config = getS3Config();
    _s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint || `https://s3.${config.region}.scw.cloud`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }
  return _s3Client;
}

/**
 * Load JSON data from storage (S3 in production, file in development).
 * Returns null if the key doesn't exist.
 */
export async function loadJson<T>(key: string): Promise<T | null> {
  if (useS3()) {
    try {
      const response = await getS3Client().send(
        new GetObjectCommand({
          Bucket: getS3Config().bucket,
          Key: key,
        }),
      );
      const body = await response.Body?.transformToString();
      return body ? JSON.parse(body) : null;
    } catch (e: any) {
      if (e.name === "NoSuchKey") {
        console.log(`[storage] Key not found in S3: ${key}`);
        return null;
      }
      console.error(`[storage] Error loading from S3: ${key}`, e);
      throw e;
    }
  }

  // File storage
  const filePath = path.join(DATA_DIR, key);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (e: any) {
    if (e.code === "ENOENT") {
      console.log(`[storage] File not found: ${filePath}`);
    } else {
      console.error(`[storage] Error loading file: ${filePath}`, e);
    }
    return null;
  }
}

/**
 * Save JSON data to storage (S3 in production, file in development).
 */
export async function saveJson<T>(key: string, data: T): Promise<void> {
  if (useS3()) {
    try {
      await getS3Client().send(
        new PutObjectCommand({
          Bucket: getS3Config().bucket,
          Key: key,
          Body: JSON.stringify(data),
          ContentType: "application/json",
        }),
      );
      console.log(`[storage] Saved to S3: ${key}`);
    } catch (e) {
      console.error(`[storage] Error saving to S3: ${key}`, e);
      throw e;
    }
    return;
  }

  // File storage
  const filePath = path.join(DATA_DIR, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`[storage] Saved to file: ${filePath}`);
}

/**
 * Delete JSON data from storage (S3 in production, file in development).
 */
export async function deleteJson(key: string): Promise<void> {
  if (useS3()) {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getS3Config().bucket,
        Key: key,
      }),
    );
    return;
  }

  // File storage
  const filePath = path.join(DATA_DIR, key);
  try {
    fs.unlinkSync(filePath);
  } catch (e: any) {
    if (e.code !== "ENOENT") throw e;
  }
}

// S3-based storage for production
class S3SessionStore implements NodeSavedSessionStore {
  private prefix = "sessions/";

  async get(key: string): Promise<NodeSavedSession | undefined> {
    try {
      const response = await getS3Client().send(
        new GetObjectCommand({
          Bucket: getS3Config().bucket,
          Key: `${this.prefix}${key}.json`,
        }),
      );
      const body = await response.Body?.transformToString();
      return body ? JSON.parse(body) : undefined;
    } catch (e: any) {
      if (e.name === "NoSuchKey") return undefined;
      throw e;
    }
  }

  async set(key: string, value: NodeSavedSession): Promise<void> {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Config().bucket,
        Key: `${this.prefix}${key}.json`,
        Body: JSON.stringify(value),
        ContentType: "application/json",
      }),
    );
  }

  async del(key: string): Promise<void> {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getS3Config().bucket,
        Key: `${this.prefix}${key}.json`,
      }),
    );
  }
}

class S3StateStore implements NodeSavedStateStore {
  private prefix = "states/";

  async get(key: string): Promise<NodeSavedState | undefined> {
    try {
      const response = await getS3Client().send(
        new GetObjectCommand({
          Bucket: getS3Config().bucket,
          Key: `${this.prefix}${key}.json`,
        }),
      );
      const body = await response.Body?.transformToString();
      return body ? JSON.parse(body) : undefined;
    } catch (e: any) {
      if (e.name === "NoSuchKey") return undefined;
      throw e;
    }
  }

  async set(key: string, value: NodeSavedState): Promise<void> {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Config().bucket,
        Key: `${this.prefix}${key}.json`,
        Body: JSON.stringify(value),
        ContentType: "application/json",
      }),
    );
  }

  async del(key: string): Promise<void> {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getS3Config().bucket,
        Key: `${this.prefix}${key}.json`,
      }),
    );
  }
}

// File-based storage for local development

class FileSessionStore implements NodeSavedSessionStore {
  private file = path.join(DATA_DIR, "sessions.json");

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private read(): Record<string, NodeSavedSession> {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf-8"));
    } catch {
      return {};
    }
  }

  private write(data: Record<string, NodeSavedSession>): void {
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }

  async get(key: string): Promise<NodeSavedSession | undefined> {
    return this.read()[key];
  }

  async set(key: string, value: NodeSavedSession): Promise<void> {
    const data = this.read();
    data[key] = value;
    this.write(data);
  }

  async del(key: string): Promise<void> {
    const data = this.read();
    delete data[key];
    this.write(data);
  }
}

class FileStateStore implements NodeSavedStateStore {
  private file = path.join(DATA_DIR, "states.json");

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private read(): Record<string, NodeSavedState> {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf-8"));
    } catch {
      return {};
    }
  }

  private write(data: Record<string, NodeSavedState>): void {
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2));
  }

  async get(key: string): Promise<NodeSavedState | undefined> {
    return this.read()[key];
  }

  async set(key: string, value: NodeSavedState): Promise<void> {
    const data = this.read();
    data[key] = value;
    this.write(data);
  }

  async del(key: string): Promise<void> {
    const data = this.read();
    delete data[key];
    this.write(data);
  }
}

export function createSessionStore(): NodeSavedSessionStore {
  const s3Enabled = useS3();
  console.log(s3Enabled ? `Session storage: S3 (${useRuntimeConfig().s3Bucket})` : "Session storage: File (.data/)");
  return s3Enabled ? new S3SessionStore() : new FileSessionStore();
}

export function createStateStore(): NodeSavedStateStore {
  return useS3() ? new S3StateStore() : new FileStateStore();
}
