import { SimpleIndexer, Tap, type TapChannel } from "@atproto/tap";
import { resolveTrustedSignerDids, verifyClaim } from "@keytrace/claims";
import { handleClaimEvent } from "./reverse-lookup-handler";
import { getReverseLookupDb } from "./reverse-lookup-db";

const CLAIM_COLLECTION = "dev.keytrace.claim";

export interface IngestorOptions {
  tapUrl: string;
  adminPassword?: string;
  trustedSigners?: string[];
}

export interface RunningIngestor {
  stop: () => Promise<void>;
}

export async function startReverseLookupIngestor(options: IngestorOptions): Promise<RunningIngestor> {
  const db = getReverseLookupDb();
  const trustedDids = await resolveTrustedSignerDids(options.trustedSigners);

  const indexer = new SimpleIndexer();
  indexer.error((err) => console.error("[reverse-lookup] tap indexer error:", err));

  indexer.record(async (evt) => {
    if (evt.collection !== CLAIM_COLLECTION) return;
    try {
      await handleClaimEvent(evt, db, (args) => verifyClaim(args, { trustedDids }));
    } catch (err) {
      console.error(`[reverse-lookup] failed to handle ${evt.action} ${evt.did}/${evt.rkey}:`, err);
    }
  });

  const tap = new Tap(options.tapUrl, { adminPassword: options.adminPassword });
  const channel: TapChannel = tap.channel(indexer, { adminPassword: options.adminPassword });
  channel.start().catch((err) => console.error("[reverse-lookup] channel.start failed:", err));

  return {
    stop: () => channel.destroy(),
  };
}
