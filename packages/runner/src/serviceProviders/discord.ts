import type { ServiceProvider } from "./types.js";

const discord: ServiceProvider = {
  id: "discord",
  name: "Discord",
  homepage: "https://discord.com",
  reUri: /^https:\/\/discord(?:\.gg|\.com\/invite)\/([a-zA-Z0-9-]+)\/?$/,
  isAmbiguous: false,

  ui: {
    description: "Link via a Discord server invite",
    icon: "discord",
    inputLabel: "Invite URL",
    inputPlaceholder: "https://discord.gg/abc123",
    instructions: [
      "Create a new Discord server (or use one you own)",
      "Set the **server name** or **server description** (which you can do in 'Server Settings' after creating) to include the verification text below",
      "Go to **Server Settings → Invites** and create a permanent invite link (set to never expire)",
      "Copy the invite URL and paste it below",
    ],
    proofTemplate: "keytrace:{did}",
  },

  processURI(uri, match) {
    const [, inviteCode] = match;
    return {
      profile: {
        display: inviteCode,
        uri: `https://discord.gg/${inviteCode}`,
      },
      proof: {
        request: {
          uri: `https://discord.com/api/v10/invites/${inviteCode}?with_counts=false&with_expiration=true`,
          fetcher: "http",
          format: "json",
        },
        target: [
          { path: ["guild", "name"], relation: "contains", format: "text" },
          { path: ["guild", "description"], relation: "contains", format: "text" },
        ],
      },
    };
  },

  postprocess(data) {
    type DiscordInviteResponse = {
      guild?: {
        id?: string;
        name?: string;
        icon?: string;
        description?: string;
      };
      inviter?: {
        id?: string;
        username?: string;
        global_name?: string;
        avatar?: string;
      };
    };
    const response = data as DiscordInviteResponse;
    const inviter = response?.inviter;
    const guild = response?.guild;

    const subject = inviter?.username ?? guild?.name;
    const displayName = inviter?.global_name ?? inviter?.username;
    const avatarUrl =
      inviter?.avatar && inviter?.id
        ? `https://cdn.discordapp.com/avatars/${inviter.id}/${inviter.avatar}.png`
        : guild?.icon && guild?.id
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
          : undefined;
    const profileUrl = inviter?.id ? `https://discord.com/users/${inviter.id}` : undefined;

    return {
      subject,
      avatarUrl,
      profileUrl,
      displayName,
    };
  },

  getProofText(did) {
    return `keytrace:${did}`;
  },

  getProofLocation() {
    return `Set your Discord server name or description to include the proof text, then create a permanent invite link`;
  },

  getRecommendations(data) {
    const response = data as { guild?: { name?: string; description?: string } };
    const recommendations: string[] = [];
    if (!response?.guild) {
      recommendations.push("Could not fetch server info. Make sure the invite link is valid and has not expired.");
      return recommendations;
    }
    const { name, description } = response.guild;
    if (!name && !description) {
      recommendations.push("The server name and description are both empty. Add your DID to one of them.");
    } else {
      recommendations.push(`Server name: "${name ?? "(empty)"}". Description: "${description ?? "(empty)"}". Make sure one of these contains your full DID.`);
    }
    return recommendations;
  },

  tests: [
    { uri: "https://discord.gg/abc123", shouldMatch: true },
    { uri: "https://discord.gg/abc123/", shouldMatch: true },
    { uri: "https://discord.com/invite/abc123", shouldMatch: true },
    { uri: "https://discord.com/invite/abc123/", shouldMatch: true },
    { uri: "https://discord.gg/my-server-name", shouldMatch: true },
    { uri: "https://discord.com/channels/123/456", shouldMatch: false },
    { uri: "https://discord.com/users/123", shouldMatch: false },
    { uri: "https://discordapp.com/invite/abc123", shouldMatch: false },
  ],
};

export default discord;
