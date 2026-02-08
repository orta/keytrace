import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getKeytraceAgent } from "./keytrace-agent"

export interface KeyPair {
  privateKey: crypto.KeyObject
  publicKey: crypto.KeyObject
  publicJwk: JsonWebKey
  privateJwk: JsonWebKey
}

/** In-memory cache for the current day's key to avoid repeated S3 lookups. */
let _cachedKey: { date: string; keyPair: KeyPair } | null = null

/**
 * Get or create today's signing key.
 * Keys are lazily generated on first use each day, stored in S3 (or .data/ in dev),
 * and the public key is published to keytrace's ATProto repo.
 */
export async function getOrCreateTodaysKey(): Promise<KeyPair> {
  const today = new Date().toISOString().split("T")[0] // "YYYY-MM-DD"

  // Fast path: in-memory cache
  if (_cachedKey && _cachedKey.date === today) {
    return _cachedKey.keyPair
  }

  // Try loading from storage
  const stored = await loadKeyFromStorage(`keys/${today}.jwk`)
  if (stored) {
    const keyPair = jwkToKeyPair(stored)
    _cachedKey = { date: today, keyPair }
    return keyPair
  }

  // Generate new key pair for today
  const keyPair = generateES256KeyPair()

  // Save private key to storage
  await saveKeyToStorage(`keys/${today}.jwk`, keyPair.privateJwk)

  // Publish public key to ATProto
  await publishKeyToATProto(today, keyPair.publicJwk)

  _cachedKey = { date: today, keyPair }
  return keyPair
}

/**
 * Generate an ECDSA P-256 key pair (ES256).
 */
export function generateES256KeyPair(): KeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
  })

  const privateJwk = privateKey.export({ format: "jwk" })
  const publicJwk = publicKey.export({ format: "jwk" })

  return { privateKey, publicKey, publicJwk, privateJwk }
}

/**
 * Convert a stored JWK (private key with d parameter) back into a KeyPair.
 */
function jwkToKeyPair(jwk: JsonWebKey): KeyPair {
  const privateKey = crypto.createPrivateKey({ key: jwk as any, format: "jwk" })
  const publicKey = crypto.createPublicKey(privateKey)
  const publicJwk = publicKey.export({ format: "jwk" })

  return { privateKey, publicKey, publicJwk, privateJwk: jwk }
}

/**
 * Publish a public key to keytrace's ATProto repo as a dev.keytrace.key record.
 * Record key = date (YYYY-MM-DD).
 */
async function publishKeyToATProto(
  date: string,
  publicJwk: JsonWebKey,
): Promise<void> {
  try {
    const agent = await getKeytraceAgent()
    const config = useRuntimeConfig()

    await agent.com.atproto.repo.putRecord({
      repo: config.keytraceDid,
      collection: "dev.keytrace.key",
      rkey: date,
      record: {
        $type: "dev.keytrace.key",
        publicJwk: JSON.stringify(publicJwk),
        validFrom: `${date}T00:00:00.000Z`,
        validUntil: `${date}T23:59:59.999Z`,
      },
    })

    console.log(`[keys] Published signing key for ${date} to ATProto`)
  } catch (error) {
    console.error(`[keys] Failed to publish key to ATProto:`, error)
    // Don't throw - key is still usable locally even if ATProto publish fails
  }
}

/**
 * Get the strong ref (URI + CID) for today's key record.
 */
export async function getTodaysKeyRef(): Promise<{
  uri: string
  cid: string
}> {
  const today = new Date().toISOString().split("T")[0]
  const config = useRuntimeConfig()
  const agent = await getKeytraceAgent()

  const response = await agent.com.atproto.repo.getRecord({
    repo: config.keytraceDid,
    collection: "dev.keytrace.key",
    rkey: today,
  })

  return {
    uri: response.data.uri,
    cid: response.data.cid!,
  }
}

// --- Storage helpers ---

function useS3(): boolean {
  return Boolean(useRuntimeConfig().s3Bucket)
}

function getS3Client(): S3Client {
  const config = useRuntimeConfig()
  return new S3Client({
    region: config.s3Region || "fr-par",
    endpoint:
      config.s3Endpoint || `https://s3.${config.s3Region || "fr-par"}.scw.cloud`,
    credentials: {
      accessKeyId: config.s3AccessKeyId,
      secretAccessKey: config.s3SecretAccessKey,
    },
    forcePathStyle: true,
  })
}

async function loadKeyFromStorage(key: string): Promise<JsonWebKey | null> {
  if (useS3()) {
    return loadKeyFromS3(key)
  }
  return loadKeyFromFile(key)
}

async function saveKeyToStorage(key: string, jwk: JsonWebKey): Promise<void> {
  if (useS3()) {
    return saveKeyToS3(key, jwk)
  }
  return saveKeyToFile(key, jwk)
}

async function loadKeyFromS3(key: string): Promise<JsonWebKey | null> {
  try {
    const config = useRuntimeConfig()
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
      }),
    )
    const body = await response.Body?.transformToString()
    return body ? JSON.parse(body) : null
  } catch (e: any) {
    if (e.name === "NoSuchKey") return null
    throw e
  }
}

async function saveKeyToS3(key: string, jwk: JsonWebKey): Promise<void> {
  const config = useRuntimeConfig()
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: JSON.stringify(jwk),
      ContentType: "application/json",
    }),
  )
}

const DATA_DIR = path.join(process.cwd(), ".data")

function loadKeyFromFile(key: string): JsonWebKey | null {
  const filePath = path.join(DATA_DIR, key)
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(content)
  } catch {
    return null
  }
}

function saveKeyToFile(key: string, jwk: JsonWebKey): void {
  const filePath = path.join(DATA_DIR, key)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(jwk), "utf-8")
}
