# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Keytrace is an identity verification system for ATProto. Users link their decentralized identities (DIDs) to external accounts (GitHub, DNS, ActivityPub, Bluesky) by creating claims that are cryptographically verified and stored as ATProto records.

## Commands

```bash
# Development
yarn dev              # Start Nuxt dev server on :3000

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

- **`packages/runner`** - Core verification library (`@keytrace/runner`). Reusable SDK for claim verification with recipe-based verification system.
- **`packages/lexicon`** - ATProto lexicon JSON schemas defining record types (`dev.keytrace.claim`, `dev.keytrace.recipe`, etc.)
- **`apps/keytrace.dev`** - Nuxt 3 full-stack web application with OAuth and API

### Verification Pipeline (Runner Package)

The runner implements a recipe-based verification system:

1. **Service Providers** (`packages/runner/src/serviceProviders/`) - Map claim URIs to verification strategies (GitHub, DNS, ActivityPub, Bluesky)
2. **Recipes** - JSON specifications defining verification steps
3. **Verification Steps** - Composable actions: `http-get`, `dns-txt`, `css-select`, `json-path`, `regex-match`

**Claim Status Flow:** `INIT` → `MATCHED` → `VERIFIED` / `FAILED` / `ERROR`

Key functions:
- `createClaim(uri, did)` - Create claim state
- `verifyClaim(claim, opts)` - Run verification
- `matchUri(uri)` - Match URI to service provider
- `runRecipe(recipe, context, config)` - Execute recipe steps

### Web App (Nuxt 3)

**Server API** (`apps/keytrace.dev/server/api/`):
- `POST /api/claims` - Create verified claim record
- `POST /api/verify` - Verify single claim
- `GET /api/profile/[handleOrDid]` - Fetch profile with claims
- `DELETE /api/claims/[rkey]` - Delete claim

**OAuth Flow** (`apps/keytrace.dev/server/routes/oauth/`):
- Login initiates ATProto OAuth
- Sessions stored with HMAC-SHA256 signed DID cookies
- Keytrace service account writes records to user repos

**Frontend**:
- Components auto-import from `components/` without `Ui` prefix (due to `pathPrefix: false` in nuxt.config)
- Composables in `composables/` for shared state
- TailwindCSS with custom `kt-*` color tokens defined in `assets/css/main.css`

## Data Flow Example

```
User submits gist URL
  → POST /api/claims
  → Runner matches URI to GitHub provider
  → Recipe executes: HTTP GET → CSS select → regex match for DID
  → Extract identity metadata (username, avatar)
  → Create attestation signature
  → Write dev.keytrace.claim to user's ATProto repo
```

## Key Files

- `packages/runner/src/types.ts` - Core type definitions
- `packages/runner/src/runner.ts` - Verification engine
- `packages/runner/src/claim.ts` - Claim state machine
- `packages/lexicon/lexicons/dev/keytrace/recipe.json` - Recipe schema
- `apps/keytrace.dev/server/api/claims/index.post.ts` - Claim creation
- `apps/keytrace.dev/assets/css/main.css` - CSS variables for theming
