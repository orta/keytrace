import { getOAuthClient, getPublicUrl } from "~/server/utils/oauth"

export default defineEventHandler(async (event) => {
  try {
    const url = getRequestURL(event)
    const params = new URLSearchParams(url.search)
    const client = getOAuthClient()

    console.log("OAuth callback params:", Object.fromEntries(params))

    const { session } = await client.callback(params)
    const did = session.did

    console.log("OAuth session created for DID:", did)

    // Store DID in a cookie
    setCookie(event, "did", did, {
      httpOnly: true,
      sameSite: "lax",
      secure: getPublicUrl().startsWith("https"),
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    return sendRedirect(event, "/")
  } catch (error) {
    console.error("OAuth callback error:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "OAuth callback failed",
      data: { details: String(error) },
    })
  }
})
