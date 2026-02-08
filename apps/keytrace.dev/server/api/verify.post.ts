/**
 * POST /api/verify
 *
 * Verify a single identity claim server-side.
 * Body: { claimUri: string, did: string }
 */

import { Claim, isValidDid } from "@keytrace/doip"

export default defineEventHandler(async (event) => {
  const body = await readBody<{ claimUri?: string; did?: string }>(event)

  if (!body?.claimUri || typeof body.claimUri !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing claimUri" })
  }

  if (!body?.did || typeof body.did !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing did" })
  }

  if (!isValidDid(body.did)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid DID format" })
  }

  try {
    const claim = new Claim(body.claimUri, body.did)
    const result = await claim.verify({ timeout: 10_000 })

    return {
      uri: claim.uri,
      did: claim.did,
      status: result.status,
      errors: result.errors,
      matches: claim.matches.map((m) => ({
        provider: m.provider.id,
        providerName: m.provider.name,
        isAmbiguous: m.isAmbiguous,
      })),
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Invalid DID")) {
      throw createError({ statusCode: 400, statusMessage: "Invalid DID format" })
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Verification failed",
    })
  }
})
