# @keytrace/relay

Relay service for verifying identity on private messaging platforms (Signal, Telegram, Discord, WhatsApp, Matrix). Uses [Matterbridge](https://github.com/42wim/matterbridge) to bridge messages from 20+ chat platforms into a single stream, then forwards them to keytrace.dev for live broadcasting and DID verification.

## Architecture

```
User sends message to bot on Signal/Telegram/Discord/etc.
    │
    ▼
┌───────────────┐       ┌──────────────────┐
│  Matterbridge │  SSE  │    Ingester      │
│               │──────▶│                  │
│ Telegram ──┐  │       │  Forwards ALL    │
│ Signal ────┤  │       │  messages to     │───▶ POST /api/chat/messages
│ Discord ───┤  │◀──────│  keytrace.dev    │
│ WhatsApp ──┘  │ reply │                  │
│               │       │  Replies when    │
│ API :4242     │       │  DID is saved    │
└───────────────┘       └──────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
            SSE broadcast            DID messages saved
            to /chat page            to relay store
                    │                       │
                    ▼                       ▼
            Live public feed         GET /api/relay/:platform/:username
            on keytrace.dev          for runner verification
```

The ingester is the **only** process that talks to Matterbridge. It reads the SSE stream and forwards every message to `POST /api/chat/messages` on keytrace.dev, which:

1. **Broadcasts** every message to connected SSE clients on the `/chat` live feed
2. **Saves** messages containing a DID to the relay store for identity verification
3. Tells the ingester whether a DID was saved, so it can reply to the user

## Live chat page

The `/chat` page on keytrace.dev shows all relay messages in real-time — a public, one-way chat room. This makes the relay transparent: users can see their messages arrive and see the "saved" indicator when a DID is stored.

Messages are displayed as:

```text
12:23  [telegram]  alice     did:plc:abc123xyz                    ✓ saved
12:24  [discord]   bob       Hello, is this working?
12:25  [signal]    +12345    did:web:example.com                  ✓ saved
```

The page connects via `EventSource` to `GET /api/chat/stream`. A 100-message buffer means new visitors see recent context.

## Deployment

The relay runs as two Docker containers side by side:

- **matterbridge** — official image, unmodified, with your config mounted in
- **ingester** — small Node container that bridges Matterbridge to keytrace.dev

### Setup

```bash
cd packages/relay

# 1. Build the ingester
yarn build

# 2. Configure Matterbridge
cp config/matterbridge.toml.example matterbridge.toml
# Edit matterbridge.toml — uncomment platforms and add bot tokens

# 3. Set environment variables
cp .env.example .env
# Edit .env — set your tokens

# 4. Start
docker compose up -d
```

### Environment variables

| Variable | Description |
|---|---|
| `MATTERBRIDGE_API_TOKEN` | Must match `Token` in `[api]` section of matterbridge.toml |
| `KEYTRACE_CHAT_URL` | Chat endpoint (default: `https://keytrace.dev/api/chat/messages`) |
| `KEYTRACE_INGEST_TOKEN` | Must match `NUXT_RELAY_INGEST_TOKEN` on the keytrace.dev server |

### Matterbridge configuration

The example config at [config/matterbridge.toml.example](config/matterbridge.toml.example) includes commented sections for each supported platform. Uncomment and configure the ones you want:

- **Telegram** — create a bot via @BotFather, add the token
- **Signal** — requires [signal-cli-rest-api](https://github.com/bbernhard/signal-cli-rest-api) running alongside
- **Discord** — create a bot at discord.com/developers
- **WhatsApp** — uses whatsmeow (built into Matterbridge)
- **Matrix** — bot username + password on any homeserver

All messages flow through to the ingester — no server-side filtering needed.

## How verification works

1. User messages the bot with their DID (e.g. `did:plc:abc123`)
2. Matterbridge receives it and streams it to the ingester
3. Ingester POSTs the message to keytrace.dev, which broadcasts it to the live chat and saves the DID
4. Ingester sends a confirmation reply back through Matterbridge to the user
5. The message appears on the `/chat` page with a green "saved" badge
6. When the user creates a claim on keytrace.dev (e.g. `telegram:alice`), the runner fetches `GET /api/relay/telegram/alice` and checks the DID matches

## Library usage

The package also exports store implementations and utilities for use in the Nuxt app:

```typescript
import { JsonStore, MemoryStore, extractDid, extractPlatform } from "@keytrace/relay";

// MemoryStore — for dev/testing
const store = new MemoryStore();

// JsonStore — for production (delegates to S3/file callbacks)
const store = new JsonStore(loadJson, saveJson, deleteJson);

// Extract DID from message text
extractDid("my DID is did:plc:abc123"); // → "did:plc:abc123"

// Extract platform from Matterbridge account string
extractPlatform("telegram.keytrace"); // → "telegram"
```

## Development

```bash
yarn test          # Run tests
yarn test:watch    # Watch mode
yarn typecheck     # Type check
yarn build         # Compile TypeScript
```
