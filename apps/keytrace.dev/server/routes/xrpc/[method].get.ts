import type { H3Event } from "h3";
import claimLexicon from "@keytrace/lexicon/lexicons/dev/keytrace/claim.json";
import { getReverseLookupDb } from "~/server/utils/reverse-lookup-db";

const KNOWN_TYPES = new Set<string>(claimLexicon.defs.main.record.properties.type.knownValues);

function xrpcError(event: H3Event, statusCode: number, error: string, message: string) {
  setResponseStatus(event, statusCode);
  setResponseHeader(event, "content-type", "application/json");
  return { error, message };
}

export default defineEventHandler(async (event) => {
  const method = getRouterParam(event, "method");

  if (method !== "dev.keytrace.reverseLookup") {
    return xrpcError(event, 404, "MethodNotImplemented", `XRPC method ${method} is not implemented by this server`);
  }

  const { type, subject } = getQuery(event) as { type?: string; subject?: string };

  if (!type || !subject) {
    return xrpcError(event, 400, "InvalidRequest", "Missing required parameters: type, subject");
  }

  if (!KNOWN_TYPES.has(type)) {
    return xrpcError(event, 400, "UnknownType", `Unknown claim type: ${type}`);
  }

  const db = getReverseLookupDb();
  const rows = db.find(type, subject);

  setResponseHeader(event, "content-type", "application/json");
  return {
    total: rows.length,
    matches: rows.map((r) => ({
      did: r.did,
      claim: `at://${r.did}/dev.keytrace.claim/${r.rkey}`,
      verifiedAt: r.verifiedAt,
      ...(r.recheckSuggested ? { recheckSuggested: true } : {}),
    })),
  };
});
