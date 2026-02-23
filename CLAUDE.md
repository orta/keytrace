# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keytrace is an identity verification system for ATProto. Users link their decentralized identities (DIDs) to external accounts (GitHub, DNS, ActivityPub, Bluesky, npm, PGP, Tangled) by creating claims that are cryptographically verified and stored as ATProto records.

## Workflow

- Do not push to remote or deploy unless explicitly asked.

## Commands

```bash
# Development (must run from monorepo root)
yarn dev              # Start Nuxt dev server on 127.0.0.1:3000

# Build
yarn build            # Build all packages (turbo)

# Testing
yarn test             # Run all tests (vitest in runner package)
cd packages/runner && yarn test:watch  # Watch mode for runner tests

# Type checking & linting
yarn typecheck        # TypeScript checking across all packages
yarn lint             # Run linting

# Formatting
yarn format           # Format with oxfmt
yarn format:check     # Check formatting
```

## Architecture

### Monorepo Structure

- **`packages/runner`** - Core verification library (`@keytrace/runner`). Recipe-based claim verification with service providers for GitHub, DNS, ActivityPub, Bluesky, npm, PGP, Tangled.
- **`packages/claims`** - Client-side claim verification library (`@keytrace/claims`). ES256 signature verification, ATProto record fetching.
- **`packages/lexicon`** - ATProto lexicon JSON schemas and generated TypeScript types. Lexicons: `dev.keytrace.claim`, `dev.keytrace.signature`, `dev.keytrace.serverPublicKey`, `dev.keytrace.statement`, `dev.keytrace.userPublicKey`, `dev.keytrace.recipe`, `dev.keytrace.profile`. Run `yarn codegen` in this package after editing lexicon JSON to regenerate `types/`.
- **`apps/keytrace.dev`** - Nuxt 3 full-stack web application with OAuth, API, and SSR.

### Verification Pipeline (Runner Package)

1. **Service Providers** (`packages/runner/src/serviceProviders/`) - Map claim URIs to verification strategies
2. **Recipes** - JSON specifications defining verification steps
3. **Verification Steps** - Composable actions: `http-get`, `dns-txt`, `css-select`, `json-path`, `regex-match`

**Claim Status Flow:** `INIT` → `MATCHED` → `VERIFIED` / `FAILED` / `ERROR`

**Record Status Field:** `verified` → `failed` (re-verifiable) or `retracted` (terminal, user-initiated)

### Cryptographic Attestation System

- **Algorithm:** ES256 (ECDSA P-256 + SHA-256), JWS compact serialization
- **Key rotation:** Daily keys stored in S3 (prod) or `.data/` (dev), published to keytrace's ATProto repo as `dev.keytrace.serverPublicKey` records
- **`sigs`** array on each claim holds one or more `dev.keytrace.signature` objects, each with a `kid` discriminator:
  - `kid: "attest:<provider>"` — attestation sig, signs `{ claimUri, createdAt, did, identity.subject, type }`
  - `kid: "status"` — status-change sig, signs `{ claimUri, did, status, lastVerifiedAt|failedAt|retractedAt }`
- **Backwards compat:** Old records may have a single `sig` object instead of `sigs` array. Use `getPrimarySig()` from `@keytrace/claims` to normalize.
- **`signedFields`** in each signature lists what fields are covered, making signatures self-documenting
- Server utils: `attestation.ts` (high-level), `signing.ts` (ES256 JWS), `keys.ts` (key management)

### Web App (Nuxt 3)

**Server API** (`apps/keytrace.dev/server/api/`):

- `GET/POST /api/claims` - List or create claims
- `PATCH /api/claims/[rkey]` - Reverify or retract a claim (adds status sig to sigs array)
- `DELETE /api/claims/[rkey]` - Delete claim
- `POST /api/verify` - Verify single claim
- `POST /api/attest` - Create attestation signature
- `GET /api/profile/[handleOrDid]` - Public profile with claims
- `GET /api/recent-claims` - Public recent claims feed
- `GET /api/recipes`, `GET /api/recipes/[provider]` - Recipe catalog
- `GET /api/services` - Service providers with UI config
- `GET/PUT /api/settings/profile` - Keytrace profile settings
- `POST /api/proxy/http`, `GET /api/proxy/dns` - SSRF-safe verification proxies

**OAuth** (`server/routes/oauth/` + `server/utils/oauth.ts`):

- ATProto OAuth with HMAC-SHA256 signed DID cookies
- Scopes: create/update/delete on `dev.keytrace.claim`, create/update on `dev.keytrace.profile`
- `dev-callback` route forwards OAuth from production to localhost for local dev
- Session endpoint detects missing scopes and returns `needsReauth` flag

**Frontend**:

- Components auto-import from `components/` without prefix (`pathPrefix: false` in nuxt.config)
- TailwindCSS v3 with custom `kt-*` color tokens in `assets/css/main.css`
- Dark mode is default; light mode via `class="light"` on html
- OG images via `nuxt-og-image` with Satori renderer; inline SSR styles disabled so crawlers reach meta tags

## Key Gotchas

- `yarn dev` must run from monorepo root, not from a package directory
- Tailwind v3 via `@nuxtjs/tailwindcss` — don't install tailwindcss v4 directly
- Nuxt server needs full restart when rebuilding workspace packages (HMR doesn't catch)
- PDS doesn't serve `app.bsky.actor.getProfile` — use `public.api.bsky.app` for profile info
- nuxt-og-image Satori flex plugin overrides `flexDirection` to `column` on divs with block children; add `class="flex-row"` to opt out
- `features.inlineStyles: false` in nuxt.config prevents 68KB of inline CSS from pushing OG tags past crawler byte limits
- ATProto lexicon `key` field uses `literal:self` for singleton records (e.g., `dev.keytrace.profile`)

## Key Files

- `packages/runner/src/types.ts` - Core type definitions
- `packages/runner/src/runner.ts` - Verification engine
- `packages/runner/src/claim.ts` - Claim state machine
- `apps/keytrace.dev/server/utils/attestation.ts` - Attestation creation (attestation + status sigs)
- `apps/keytrace.dev/server/utils/signing.ts` - ES256 JWS signing primitives
- `apps/keytrace.dev/server/utils/keys.ts` - Daily key rotation and S3 storage
- `apps/keytrace.dev/server/utils/oauth.ts` - OAuth client, scopes, signed cookies
- `apps/keytrace.dev/server/api/claims/index.post.ts` - Claim creation endpoint
- `apps/keytrace.dev/assets/css/main.css` - CSS variables for theming

## Data Flow Example

```text
User submits gist URL
  → POST /api/claims
  → Runner matches URI to GitHub provider
  → Recipe executes: HTTP GET → CSS select → regex match for DID
  → Extract identity metadata (username, avatar)
  → Create attestation signature (added to sigs array with signedFields)
  → Write dev.keytrace.claim to user's ATProto repo
  → Status set to "verified" with lastVerifiedAt timestamp
```
