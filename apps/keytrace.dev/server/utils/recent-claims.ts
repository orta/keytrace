import fs from "node:fs";
import path from "node:path";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

export interface RecentClaim {
  did: string;
  handle: string;
  avatar?: string;
  type: string;
  subject: string;
  displayName: string;
  createdAt: string;
}

const FEED_KEY = "recent-claims.json";
const MAX_ITEMS = 50;

/**
 * Add a claim to the recent claims feed.
 * Prepends to the list, trims to 50 items, and saves.
 */
export async function addRecentClaim(claim: RecentClaim): Promise<void> {
  const feed = await getRecentClaims();
  feed.unshift(claim);
  if (feed.length > MAX_ITEMS) feed.length = MAX_ITEMS;
  await saveRecentClaims(feed);
}

/**
 * Get the recent claims feed from storage.
 */
export async function getRecentClaims(): Promise<RecentClaim[]> {
  if (useS3Storage()) {
    return loadFromS3();
  }
  return loadFromFile();
}

// --- Internal helpers ---

function useS3Storage(): boolean {
  return Boolean(useRuntimeConfig().s3Bucket);
}

function getS3Client(): S3Client {
  const config = useRuntimeConfig();
  return new S3Client({
    region: config.s3Region || "fr-par",
    endpoint: config.s3Endpoint || `https://s3.${config.s3Region || "fr-par"}.scw.cloud`,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
    forcePathStyle: true,
  });
}

async function saveRecentClaims(feed: RecentClaim[]): Promise<void> {
  if (useS3Storage()) {
    return saveToS3(feed);
  }
  return saveToFile(feed);
}

async function loadFromS3(): Promise<RecentClaim[]> {
  try {
    const config = useRuntimeConfig();
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: config.s3Bucket,
        Key: FEED_KEY,
      }),
    );
    const body = await response.Body?.transformToString();
    return body ? JSON.parse(body) : [];
  } catch (e: any) {
    if (e.name === "NoSuchKey") return [];
    throw e;
  }
}

async function saveToS3(feed: RecentClaim[]): Promise<void> {
  const config = useRuntimeConfig();
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: FEED_KEY,
      Body: JSON.stringify(feed),
      ContentType: "application/json",
    }),
  );
}

const DATA_DIR = path.join(process.cwd(), ".data");

function loadFromFile(): RecentClaim[] {
  const filePath = path.join(DATA_DIR, FEED_KEY);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

function saveToFile(feed: RecentClaim[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = path.join(DATA_DIR, FEED_KEY);
  fs.writeFileSync(filePath, JSON.stringify(feed, null, 2), "utf-8");
}
