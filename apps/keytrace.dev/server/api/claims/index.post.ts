/**
 * POST /api/claims
 *
 * Create a new identity claim record in the authenticated user's ATProto repo.
 * Requires authentication. Body: { claimUri: string, comment?: string }
 */

import { COLLECTION_NSID, serviceProviders } from "@keytrace/doip"
import { getSessionAgent } from "~/server/utils/session"

export default defineEventHandler(async (event) => {
  const { did, agent } = await getSessionAgent(event)

  const body = await readBody<{
    claimUri?: string
    comment?: string
  }>(event)

  if (!body?.claimUri || typeof body.claimUri !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing claimUri" })
  }

  // Validate that the URI matches a known service provider
  const matches = serviceProviders.matchUri(body.claimUri)
  if (matches.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Claim URI does not match any known service provider",
    })
  }

  try {
    const record = {
      $type: COLLECTION_NSID,
      claimUri: body.claimUri,
      comment: body.comment,
      createdAt: new Date().toISOString(),
    }

    const result = await agent.com.atproto.repo.createRecord({
      repo: did,
      collection: COLLECTION_NSID,
      record,
    })

    return {
      uri: result.data.uri,
      cid: result.data.cid,
      record,
    }
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create claim record",
    })
  }
})
