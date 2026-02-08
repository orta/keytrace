import { getClientMetadata } from "~/server/utils/oauth"

export default defineEventHandler(() => {
  return getClientMetadata()
})
