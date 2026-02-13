import { JsonStore } from "@keytrace/relay";
import type { RelayStore } from "@keytrace/relay";

let _store: RelayStore | null = null;

/** Get the relay store singleton (JsonStore backed by S3/file storage, read-only from Nuxt's perspective) */
export function getRelayStore(): RelayStore {
  if (!_store) {
    _store = new JsonStore(loadJson, saveJson, deleteJson);
    console.log(`[relay] Store initialized (${useS3() ? "S3" : "file"})`);
  }
  return _store;
}
