import * as p from "@clack/prompts";
import { AtpAgent } from "@atproto/api";
import { serviceProviders } from "@keytrace/runner";
import type { ServiceProvider } from "@keytrace/runner";
import { loadConfig } from "../lib/config.js";

const { getAllProviders, matchUri } = serviceProviders;

/** Strip markdown links for terminal display: [text](url) → text */
function stripMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function validateClaimUri(v: string | undefined, provider: ServiceProvider): string | undefined {
  if (!v || !v.trim()) return "Required";
  const matches = matchUri(v.trim());
  if (matches.length === 0) return `URL doesn't match ${provider.name} pattern`;
  if (matches[0].provider.id !== provider.id)
    return `URL matched ${matches[0].provider.name}, not ${provider.name}`;
}

export async function claimCommand(providerArg?: string): Promise<void> {
  const config = await loadConfig();
  if (!config) {
    p.log.error("Not logged in. Run `kt login` first.");
    process.exit(1);
  }

  // Pick provider
  let providerId: string;

  if (providerArg) {
    providerId = providerArg.toLowerCase();
    const all = getAllProviders();
    if (!all.find((pr) => pr.id === providerId)) {
      p.log.error(
        `Unknown provider: ${providerId}\nAvailable: ${all.map((pr) => pr.id).join(", ")}`,
      );
      process.exit(1);
    }
  } else {
    const providers = getAllProviders();
    const chosen = await p.select({
      message: "Which platform do you want to claim?",
      options: providers.map((pr) => ({
        value: pr.id,
        label: pr.name,
        hint: pr.ui.description,
      })),
    });
    if (p.isCancel(chosen)) { p.cancel("Cancelled."); process.exit(0); }
    providerId = chosen as string;
  }

  const provider = getAllProviders().find((pr) => pr.id === providerId)!;

  // Collect claim URI
  let claimUri: string;

  const defaultVal = provider.ui.inputDefaultTemplate
    ? provider.ui.inputDefaultTemplate
        .replace("{did}", config.did)
        .replace("{handle}", config.handle)
        .replace("{slugHandle}", config.handle.replace(/\./g, "-"))
    : "";

  const input = await p.text({
    message: provider.ui.inputLabel,
    placeholder: provider.ui.inputPlaceholder,
    initialValue: defaultVal || undefined,
    validate: (v) => validateClaimUri(v, provider),
  });
  if (p.isCancel(input)) { p.cancel("Cancelled."); process.exit(0); }
  claimUri = (input as string).trim();

  // Parse the URI to get subject info
  const uriMatch = claimUri.match(provider.reUri);
  if (!uriMatch) {
    p.log.error("URI does not match provider pattern.");
    process.exit(1);
  }
  const processed = provider.processURI(claimUri, uriMatch);
  const subject = processed.profile.display.replace(/^@/, "");

  // Show proof instructions
  const proofText = provider.ui.proofTemplate
    .replace("{did}", config.did)
    .replace("{handle}", config.handle);

  const locationNote = provider.getProofLocation
    ? stripMarkdownLinks(provider.getProofLocation(uriMatch))
    : null;

  p.note(
    [
      ...provider.ui.instructions.map((s: string, i: number) => `${i + 1}. ${stripMarkdownLinks(s)}`),
      "",
      "Proof content to paste:",
      proofText,
      ...(locationNote ? ["", locationNote] : []),
    ].join("\n"),
    `Set up your ${provider.name} proof`,
  );

  const ready = await p.confirm({
    message: "Have you set up the proof?",
    initialValue: true,
  });
  if (p.isCancel(ready) || !ready) { p.cancel("Cancelled."); process.exit(0); }

  // Require a key — the CLI always self-signs via keyRef
  if (config.keys.length === 0) {
    p.log.error(
      "No public keys uploaded. The CLI requires a key to create claims.\nUse https://keytrace.dev to create claims without a key, or run `kt login` to upload one.",
    );
    process.exit(1);
  }

  const keyChoice = await p.select({
    message: "Which key should this claim be linked to?",
    options: config.keys.map((k) => ({
      value: k.atUri,
      label: `${k.label} (${k.keyType})`,
      hint: k.fingerprint,
    })),
  });
  if (p.isCancel(keyChoice)) { p.cancel("Cancelled."); process.exit(0); }
  const selectedKey = config.keys.find((k) => k.atUri === (keyChoice as string))!;

  // Build the claim record (without selfSig — that's added after signing)
  const createdAt = new Date().toISOString();

  const record: Record<string, unknown> = {
    $type: "dev.keytrace.claim",
    type: providerId,
    claimUri,
    identity: {
      subject,
      profileUrl: processed.profile.uri,
    },
    sigs: [],
    createdAt,
  };

  // Link the selected key — proof of authorship comes from the ATProto repo commit signature
  if (selectedKey) {
    record.selfSig = { keyRef: selectedKey.atUri, createdAt };
  }

  // Publish to ATProto
  const publishSpinner = p.spinner();
  publishSpinner.start("Publishing claim to your ATProto repo…");

  try {
    const agent = new AtpAgent({ service: config.pdsUrl });
    await agent.resumeSession({
      did: config.did,
      handle: config.handle,
      accessJwt: config.accessJwt,
      refreshJwt: config.refreshJwt,
      active: true,
    });

    const res = await agent.api.com.atproto.repo.createRecord({
      repo: config.did,
      collection: "dev.keytrace.claim",
      record,
    });

    const atUri = res.data.uri;
    publishSpinner.stop("Published!");

    p.outro(
      [
        `Claim created: ${atUri}`,
        "",
        `View on keytrace: https://keytrace.dev/${config.handle}`,
        selectedKey
          ? `\nThis claim is self-signed. Verify it using the public key at:\n  ${selectedKey.atUri}`
          : "\nThis claim has no self-signature. Keytrace.dev will verify it when it crawls your repo.",
      ]
        .join("\n")
        .trim(),
    );
  } catch (err) {
    publishSpinner.stop("Failed to publish");
    p.log.error(String(err));
    process.exit(1);
  }
}
