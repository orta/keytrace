import type { ServiceProvider } from "./types.js";

/** Base URL for the relay endpoint — served by the main keytrace.dev app */
const RELAY_URL = process.env.KEYTRACE_RELAY_URL ?? "https://keytrace.dev/api/relay";

interface RelayPlatformConfig {
  id: string;
  name: string;
  homepage: string;
  icon: string;
  /** Regex pattern for the username part (after "platform:") */
  usernamePattern: string;
  /** Description for the UI service picker */
  description: string;
  /** Placeholder for the claim URI input */
  inputPlaceholder: string;
  /** Step-by-step instructions */
  instructions: string[];
}

function createRelayProvider(config: RelayPlatformConfig): ServiceProvider {
  const reUri = new RegExp(`^${config.id}:(.+)$`);

  return {
    id: config.id,
    name: config.name,
    homepage: config.homepage,
    reUri,
    isAmbiguous: false,

    ui: {
      description: config.description,
      icon: config.icon,
      inputLabel: `${config.name} Username`,
      inputPlaceholder: config.inputPlaceholder,
      inputDefaultTemplate: `${config.id}:{slugHandle}`,
      instructions: config.instructions,
      proofTemplate: "{did}",
    },

    processURI(_uri, match) {
      const [, username] = match;
      return {
        profile: {
          display: username,
          uri: `${config.homepage}`,
        },
        proof: {
          request: {
            uri: `${RELAY_URL}/${config.id}/${encodeURIComponent(username)}`,
            fetcher: "http",
            format: "json",
          },
          target: [{ path: ["did"], relation: "contains", format: "text" }],
        },
      };
    },

    getProofText(did) {
      return did;
    },

    getProofLocation() {
      return `Send your DID as a message to the Keytrace bot on ${config.name}`;
    },

    tests: [
      { uri: `${config.id}:testuser`, shouldMatch: true },
      { uri: `${config.id}:test.user.123`, shouldMatch: true },
      { uri: `https://${config.id}.example.com/user`, shouldMatch: false },
    ],
  };
}

export const signal = createRelayProvider({
  id: "signal",
  name: "Signal",
  homepage: "https://signal.org",
  icon: "message-circle",
  usernamePattern: "[a-zA-Z0-9_.]+",
  description: "Link via Signal message",
  inputPlaceholder: "your_signal_username",
  instructions: [
    "Open Signal and find the **Keytrace Verify** bot",
    "Send your DID (shown below) as a message to the bot",
    "Enter your Signal username below and verify",
  ],
});

export const telegram = createRelayProvider({
  id: "telegram",
  name: "Telegram",
  homepage: "https://telegram.org",
  icon: "send",
  usernamePattern: "[a-zA-Z0-9_]+",
  description: "Link via Telegram message",
  inputPlaceholder: "your_telegram_username",
  instructions: [
    "Open Telegram and find **@KeytraceVerifyBot**",
    "Send your DID (shown below) as a message to the bot",
    "Enter your Telegram username below and verify",
  ],
});

export const discord = createRelayProvider({
  id: "discord",
  name: "Discord",
  homepage: "https://discord.com",
  icon: "hash",
  usernamePattern: "[a-zA-Z0-9_.]+",
  description: "Link via Discord message",
  inputPlaceholder: "your_discord_username",
  instructions: [
    "Join the Keytrace Discord server and find the **#verify** channel",
    "Send your DID (shown below) as a message in that channel",
    "Enter your Discord username below and verify",
  ],
});

export const whatsapp = createRelayProvider({
  id: "whatsapp",
  name: "WhatsApp",
  homepage: "https://whatsapp.com",
  icon: "phone",
  usernamePattern: "[0-9+]+",
  description: "Link via WhatsApp message",
  inputPlaceholder: "+1234567890",
  instructions: [
    "Send a message to the Keytrace WhatsApp number",
    "Include your DID (shown below) in the message",
    "Enter your phone number below and verify",
  ],
});

export const matrix = createRelayProvider({
  id: "matrix",
  name: "Matrix",
  homepage: "https://matrix.org",
  icon: "grid-3x3",
  usernamePattern: "@[a-zA-Z0-9._=-]+:[a-zA-Z0-9.-]+",
  description: "Link via Matrix message",
  inputPlaceholder: "@user:matrix.org",
  instructions: [
    "Send a direct message to **@keytrace:matrix.org**",
    "Include your DID (shown below) in the message",
    "Enter your Matrix ID below and verify",
  ],
});
