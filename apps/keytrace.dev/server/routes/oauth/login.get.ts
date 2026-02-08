import { getOAuthClient } from "~/server/utils/oauth"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const handle = query.handle as string

  if (!handle) {
    throw createError({ statusCode: 400, statusMessage: "Missing handle parameter" })
  }

  try {
    const client = getOAuthClient()
    const url = await client.authorize(handle, {
      scope: "atproto",
    })

    return sendRedirect(event, url.toString())
  } catch (error) {
    console.error("OAuth login error:", error)
    return sendRedirect(event, "/?error=auth_failed")
  }
})
