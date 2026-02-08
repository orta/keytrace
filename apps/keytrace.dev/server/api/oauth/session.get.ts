export default defineEventHandler(async (event) => {
  const did = getCookie(event, "did")
  console.log("Session check - DID from cookie:", did)

  if (!did) {
    return { authenticated: false }
  }

  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
    )
    const profile = await response.json()

    return {
      authenticated: true,
      did,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
    }
  } catch (error) {
    console.error("Profile fetch error:", error)
    return {
      authenticated: true,
      did,
    }
  }
})
