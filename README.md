# Keytrace

Identity verification for ATProto. Link your decentralized identity (DID) to external accounts like GitHub, DNS, and Mastodon with cryptographically signed attestations.

## What is Keytrace?

Keytrace allows Bluesky users to prove ownership of external accounts by:

1. **Creating a claim** - Post a verification token to your GitHub gist, DNS TXT record, or other supported platform
2. **Verification** - Keytrace fetches and validates the proof contains your DID
3. **Attestation** - A cryptographic signature is created and stored in your ATProto repo as a `dev.keytrace.claim` record

Claims are user-owned, portable, and stored directly in your ATProto repository.

## Project Structure

```text
keytrace/
├── apps/
│   └── keytrace.dev/     # Nuxt 3 web application
├── packages/
│   ├── runner/           # Core verification library (@keytrace/runner)
│   └── lexicon/          # ATProto lexicon schemas
```

## Development

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Run tests
yarn test

# Type checking
yarn typecheck

# Format code
yarn format
```

## How Verification Works

The runner package implements a recipe-based verification system:

1. **Service Providers** match claim URIs to verification strategies
2. **Recipes** define verification steps as JSON specifications
3. **Verification Steps** are composable actions: `http-get`, `dns-txt`, `css-select`, `json-path`, `regex-match`

Example flow:

```text
User submits gist URL
  → Match URI to GitHub provider
  → Execute recipe: HTTP GET → CSS select → regex match for DID
  → Extract identity metadata (username, avatar)
  → Create attestation signature
  → Write dev.keytrace.claim to user's ATProto repo
```

## ATProto Lexicons

- `dev.keytrace.claim` - Identity claim linking a DID to an external account
- `dev.keytrace.recipe` - Verification recipe specification
- `dev.keytrace.key` - Daily signing key for attestations
- `dev.keytrace.signature` - Cryptographic attestation structure

## Deployment

### Publishing Packages

Use the deploy script to bump versions and publish all packages to npm:

```bash
./scripts/deploy.sh patch   # 0.0.1 → 0.0.2
./scripts/deploy.sh minor   # 0.0.2 → 0.1.0
./scripts/deploy.sh major   # 0.1.0 → 1.0.0
```

This will:
1. Bump versions in `@keytrace/runner`, `@keytrace/claims`, and `@keytrace/lexicon`
2. Build all packages
3. Publish to npm
4. Create a git commit and tag

After running, push to remote:

```bash
git push && git push --tags
```


## Adding a New Service Provider

Want to add support for a new platform (e.g., GitLab, Codeberg, Tangled.) The key requirement is that the platform must have some way for users to **publicly post text content** that Keytrace can fetch and verify — things like profile bios, public posts, gists, comments, or files.

### Proof of Identity Pattern

Every service provider follows the same pattern:

1. The user places a **proof string** (containing their DID) somewhere publicly readable on the service
2. Keytrace fetches that public URL and checks that the proof string is present
3. Metadata (username, avatar, profile URL) is extracted from the response

Good proof locations include: public gists/snippets, profile bios, DNS TXT records, public repos, pinned posts, or any content the user controls that's fetchable via HTTP.

You need to be careful that it's a place where only the identity can post. For example you can post a GitHub gist with a keytrace DID but the comments can also contain keytrace DIDs for other people. This could be used to make a false claim.

### What You Need to Create

All you need to touch is the `packages/runner/` package — the web app picks up new providers automatically via the `/api/services` endpoint and a shared `useServiceRegistry` composable.

1. **Create a provider file** in `packages/runner/src/serviceProviders/` implementing the `ServiceProvider` interface:
   - `id`, `name`, `homepage` — basic metadata
   - `reUri` — regex to match claim URIs
   - `ui` — wizard configuration (icon, instructions, proof template, input labels)
   - `processURI()` — converts a matched URI into fetch + verification config
   - `postprocess()` — extracts identity metadata (username, avatar, profile URL)
   - `getProofText()` — generates the proof string for the user
   - `tests` — URI match test cases

2. **Register it** in `packages/runner/src/serviceProviders/index.ts`

3. **Icon**: Set `ui.icon` to a [Lucide](https://lucide.dev/icons/) icon name (e.g., `"github"`, `"globe"`, `"shield"`) and the web app renders it automatically. If your service needs a custom SVG icon, add a component to `apps/keytrace.dev/components/icons/` and register it in the `iconMap` in `apps/keytrace.dev/composables/useServiceRegistry.ts`. Set `ui.iconDisplay: "raw"` for standalone SVGs (like npm/tangled) that shouldn't be wrapped in a circular badge.

### Using Claude Code to Add a Provider

From the repo root, try a prompt like:

> Add a new service provider for [ServiceName]. Users will prove their identity by [describe the proof location, e.g. "creating a public snippet on GitLab containing their DID", or "adding their DID to their Codeberg profile bio"]. The proof URL format is [e.g. "https://gitlab.com/-/snippets/:id"]. Look at the existing providers in `packages/runner/src/serviceProviders/` for the pattern — especially `github.ts` for an HTTP+JSON example or `dns.ts` for a simpler one. Register the new provider in the index file and add URI match tests.

That should give Claude Code enough to:

- Create a new file in `packages/runner/src/serviceProviders/`
- Implement the `ServiceProvider` interface (URI regex, `processURI`, `ui` config, `getProofText`, test cases)
- Register it in `packages/runner/src/serviceProviders/index.ts`

### What Goes in the PR

When you open your PR, please include:

- **How to create a proof**: Step-by-step instructions for how a user creates the public proof on the service (e.g., "go to gitlab.com/-/snippets/new, paste this, make it public")
- **Example proof URL**: A real or realistic example URL so I can test the flow
- **Any API quirks**: Rate limits, auth requirements, non-standard response formats, CORS issues, etc.
- **Fetcher needs**: The existing fetchers are `http`, `dns`, and `activitypub`. If your service needs something different, note that

## License

MIT
