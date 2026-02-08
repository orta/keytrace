import { getOAuthClient } from "~/server/utils/oauth"

export default defineEventHandler(async (event) => {
  const did = getCookie(event, "did")

  if (did) {
    try {
      const client = getOAuthClient()
      await client.revoke(did)
    } catch {
      // Ignore revocation errors
    }
  }

  deleteCookie(event, "did", { path: "/" })
  return { success: true }
})
