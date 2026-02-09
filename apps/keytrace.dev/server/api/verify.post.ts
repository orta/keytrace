/**
 * POST /api/verify
 *
 * Verify a single identity claim server-side.
 * Body: { claimUri: string, did: string }
 */

import { createClaim, verifyClaim, isValidDid } from "@keytrace/runner";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ claimUri?: string; did?: string }>(event);

  if (!body?.claimUri || typeof body.claimUri !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing claimUri" });
  }

  if (!body?.did || typeof body.did !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Missing did" });
  }

  if (!isValidDid(body.did)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid DID format" });
  }

  try {
    console.log(`[verify] Starting verification: uri=${body.claimUri} did=${body.did}`);
    const claim = createClaim(body.claimUri, body.did);
    const result = await verifyClaim(claim, { timeout: 10_000 });

    console.log(`[verify] Result: status=${result.status} errors=${JSON.stringify(result.errors)} matches=${JSON.stringify(claim.matches.map((m) => m.provider.id))}`);

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
      identity: result.identity,
    };
  } catch (err: unknown) {
    console.error(`[verify] Error:`, err);
    if (err instanceof Error && err.message.includes("Invalid DID")) {
      throw createError({ statusCode: 400, statusMessage: "Invalid DID format" });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Verification failed",
    });
  }
});
