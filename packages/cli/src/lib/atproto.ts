import { AtpAgent } from "@atproto/api";
import type { Config } from "./config.js";

export function makeAgent(config: Config): AtpAgent {
  return new AtpAgent({ service: config.pdsUrl });
}

export async function resumeSession(config: Config): Promise<AtpAgent> {
  const agent = makeAgent(config);
  await agent.resumeSession({
    did: config.did,
    handle: config.handle,
    accessJwt: config.accessJwt,
    refreshJwt: config.refreshJwt,
    active: true,
  });
  return agent;
}

/** Resolve a handle to a DID + PDS endpoint using the public ATProto directory. */
export async function resolveHandle(
  handle: string,
): Promise<{ did: string; pdsUrl: string }> {
  const agent = new AtpAgent({ service: "https://bsky.social" });
  const res = await agent.resolveHandle({ handle });
  const did = res.data.did;

  // Fetch the DID document to find the PDS endpoint
  let docUrl: string;
  if (did.startsWith("did:plc:")) {
    docUrl = `https://plc.directory/${did}`;
  } else if (did.startsWith("did:web:")) {
    const domain = did.slice("did:web:".length);
    docUrl = `https://${domain}/.well-known/did.json`;
  } else {
    throw new Error(`Unsupported DID method: ${did}`);
  }

  const docRes = await fetch(docUrl);
  if (!docRes.ok) throw new Error(`Failed to fetch DID document for ${did}`);
  const doc = (await docRes.json()) as {
    service?: { id: string; serviceEndpoint: string }[];
  };

  const pdsService = doc.service?.find(
    (s) => s.id === "#atproto_pds" || s.id === "atproto_pds",
  );
  if (!pdsService) throw new Error(`No PDS service found in DID document`);

  return { did, pdsUrl: pdsService.serviceEndpoint };
}
