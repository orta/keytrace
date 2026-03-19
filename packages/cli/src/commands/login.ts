import * as p from "@clack/prompts";
import { AtpAgent } from "@atproto/api";
import { resolveHandle } from "../lib/atproto.js";
import { findAllKeys, type FoundKey } from "../lib/keyring.js";
import { saveConfig, loadConfig, type StoredKey } from "../lib/config.js";

export async function loginCommand(): Promise<void> {
  p.intro("Welcome to keytrace!");

  const handle = await p.text({
    message: "Your Bluesky handle",
    placeholder: "e.g. orta.io",
    validate: (v) => (v?.trim() ? undefined : "Handle is required"),
  });
  if (p.isCancel(handle)) { p.cancel("Cancelled."); process.exit(0); }

  p.note(
    [
      "An app password lets kt access your ATProto repo without sharing your main password.",
      "",
      "To create one:",
      "  1. Go to https://bsky.app/settings/app-passwords",
      "  2. Click 'Add App Password'",
      "  3. Give it a name like 'keytrace-cli'",
      "  4. Copy the generated password (xxxx-xxxx-xxxx-xxxx format)",
    ].join("\n"),
    "App Password",
  );

  const appPassword = await p.password({
    message: "App password",
    validate: (v) => (v?.trim() ? undefined : "App password is required"),
  });
  if (p.isCancel(appPassword)) { p.cancel("Cancelled."); process.exit(0); }

  const spinner = p.spinner();
  spinner.start("Authenticating…");

  let did: string;
  let pdsUrl: string;
  let accessJwt: string;
  let refreshJwt: string;

  try {
    ({ did, pdsUrl } = await resolveHandle(handle as string));
    const agent = new AtpAgent({ service: pdsUrl });
    const session = await agent.login({
      identifier: handle as string,
      password: appPassword as string,
    });
    accessJwt = session.data.accessJwt;
    refreshJwt = session.data.refreshJwt;
    spinner.stop(`Authenticated as ${handle} (${did})`);
  } catch (err) {
    spinner.stop("Authentication failed");
    p.log.error(String(err));
    process.exit(1);
  }

  // Key discovery
  spinner.start("Looking for your public keys…");
  const found = await findAllKeys();
  spinner.stop(
    found.length > 0
      ? `Found ${found.length} key(s)`
      : "No supported keys found",
  );

  let selectedKeys: FoundKey[] = [];

  if (found.length === 0) {
    p.note(
      [
        "No SSH or PGP keys found. To generate one:",
        "",
        "  SSH Ed25519 (recommended):",
        '    ssh-keygen -t ed25519 -C "your@email.com"',
        "",
        "  PGP:",
        "    gpg --full-generate-key",
        "",
        "Re-run `kt login` after generating a key.",
      ].join("\n"),
      "No keys found",
    );
  } else {
    const options = found.map((k) => ({
      value: k,
      label: `${k.label} (${k.keyType})`,
      hint: k.fingerprint,
    }));

    const chosen = await p.multiselect<FoundKey>({
      message: "Which keys would you like to upload to your ATProto repo as dev.keytrace.userPublicKey records?",
      options,
      required: false,
    });
    if (p.isCancel(chosen)) { p.cancel("Cancelled."); process.exit(0); }
    selectedKeys = chosen as FoundKey[];
  }

  // Upload selected keys
  const storedKeys: StoredKey[] = [];

  if (selectedKeys.length > 0) {
    const agent = new AtpAgent({ service: pdsUrl });
    await agent.resumeSession({
      did,
      handle: handle as string,
      accessJwt,
      refreshJwt,
      active: true,
    });

    for (const key of selectedKeys) {
      const uploadSpinner = p.spinner();
      uploadSpinner.start(`Uploading ${key.label}…`);
      try {
        const res = await agent.api.com.atproto.repo.createRecord({
          repo: did,
          collection: "dev.keytrace.userPublicKey",
          record: {
            $type: "dev.keytrace.userPublicKey",
            keyType: key.keyType,
            publicKeyArmored: key.publicKeyArmored,
            fingerprint: key.fingerprint,
            label: key.label,
            createdAt: new Date().toISOString(),
          },
        });

        const rkey = res.data.uri.split("/").pop()!;
        const atUri = res.data.uri;

        storedKeys.push({
          rkey,
          atUri,
          keyType: key.keyType,
          fingerprint: key.fingerprint,
          label: key.label,
          keyFile: key.keyFile,
          pgpKeyId: key.pgpKeyId,
        });

        uploadSpinner.stop(`Uploaded ${key.label} → ${atUri}`);
      } catch (err) {
        uploadSpinner.stop(`Failed to upload ${key.label}`);
        p.log.error(String(err));
      }
    }
  }

  // Check for already-uploaded keys from a previous login
  const existing = await loadConfig();
  const mergedKeys = [
    ...(existing?.keys ?? []).filter(
      (k) => !storedKeys.find((s) => s.fingerprint === k.fingerprint),
    ),
    ...storedKeys,
  ];

  await saveConfig({
    handle: handle as string,
    did,
    pdsUrl,
    accessJwt,
    refreshJwt,
    keys: mergedKeys,
  });

  p.outro(
    mergedKeys.length > 0
      ? `Logged in! ${mergedKeys.length} key(s) ready for signing. Run \`kt claim <provider>\` to create a claim.`
      : "Logged in! Run `kt login` again after adding keys, or run `kt claim <provider>` to create an unsigned claim.",
  );
}
