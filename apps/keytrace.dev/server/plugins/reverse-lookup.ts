import { startReverseLookupIngestor, type RunningIngestor } from "../utils/reverse-lookup-ingestor";

export default defineNitroPlugin((nitroApp) => {
  const tapUrl = process.env.KEYTRACE_TAP_URL;
  if (!tapUrl) {
    console.log("[reverse-lookup] KEYTRACE_TAP_URL not set, skipping tap ingestor");
    return;
  }

  let ingestor: RunningIngestor | null = null;
  startReverseLookupIngestor({
    tapUrl,
    adminPassword: process.env.KEYTRACE_TAP_ADMIN_PASSWORD,
  })
    .then((i) => {
      ingestor = i;
      console.log(`[reverse-lookup] tap ingestor connected to ${tapUrl}`);
    })
    .catch((err) => console.error("[reverse-lookup] failed to start ingestor:", err));

  nitroApp.hooks.hook("close", async () => {
    await ingestor?.stop();
  });
});
