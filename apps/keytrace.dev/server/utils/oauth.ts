import { NodeOAuthClient } from "@atproto/oauth-client-node"
import { createSessionStore, createStateStore } from "./storage"

let _oauthClient: NodeOAuthClient | null = null

export function getPublicUrl(): string {
  const config = useRuntimeConfig()
  return (config.public.publicUrl || "http://127.0.0.1:3000").replace(
    /\/$/,
    "",
  )
}

function isLoopback(url: string): boolean {
  return (
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1")
  )
}

export function getClientMetadata() {
  const publicUrl = getPublicUrl()

  // ATProto OAuth has different rules for dev vs production:
  // - client_id must use http://localhost (not IP) for loopback dev
  // - redirect_uris must use http://127.0.0.1 (not localhost) per RFC 8252
  // - production requires HTTPS for both
  const loopback = isLoopback(publicUrl)

  const clientIdBase = loopback
    ? "http://localhost"
    : publicUrl
  const redirectBase = loopback
    ? publicUrl.replace("http://localhost", "http://127.0.0.1")
    : publicUrl

  return {
    client_id: `${clientIdBase}/.well-known/oauth-client-metadata.json`,
    client_name: "keytrace.dev",
    client_uri: publicUrl,
    redirect_uris: [`${redirectBase}/oauth/callback`] as [string],
    grant_types: ["authorization_code", "refresh_token"] as [
      "authorization_code",
      "refresh_token",
    ],
    response_types: ["code"] as ["code"],
    scope: "atproto transition:generic",
    token_endpoint_auth_method: "none" as const,
    application_type: "web" as const,
    dpop_bound_access_tokens: true,
  }
}

export function getOAuthClient(): NodeOAuthClient {
  if (!_oauthClient) {
    _oauthClient = new NodeOAuthClient({
      clientMetadata: getClientMetadata(),
      stateStore: createStateStore(),
      sessionStore: createSessionStore(),
    })
  }
  return _oauthClient
}
