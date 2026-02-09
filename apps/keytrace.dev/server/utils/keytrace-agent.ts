import { AtpAgent } from "@atproto/api";

let _agent: AtpAgent | null = null;

/**
 * Get a singleton ATProto agent authenticated as the keytrace service account.
 * Uses app password credentials from runtime config.
 */
export async function getKeytraceAgent(): Promise<AtpAgent> {
  if (!_agent) {
    const config = useRuntimeConfig();
    if (!config.keytraceDid || !config.keytraceAppPassword) {
      throw new Error("Missing NUXT_KEYTRACE_DID or NUXT_KEYTRACE_APP_PASSWORD environment variables");
    }
    _agent = new AtpAgent({ service: "https://bsky.social" });
    await _agent.login({
      identifier: config.keytraceDid,
      password: config.keytraceAppPassword,
    });
  }
  return _agent;
}
