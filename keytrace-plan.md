# Project: Keytraces - ATProto Identity Verification

## Overview

A Keybase/Keyoxide-style identity verification system built on ATProto. Users prove ownership of external accounts (GitHub, Mastodon, domains, etc.) by storing cryptographically signed claims in their ATProto repository.

**Key differences from Keyoxide:**

- Uses ATProto DIDs instead of PGP keys (no key generation UX nightmare)
- Claims stored as ATProto records, not PGP notations
- OAuth-based onboarding instead of "paste your fingerprint"
- Data portable with the user's PDS

## Monorepo Structure

```
/
├── packages/
│   ├── keytrace-runner/          # Generic recipe execution engine (Node + Browser)
│   │   ├── src/
│   │   │   ├── runner.ts         # Recipe execution engine
│   │   │   ├── actions/          # Built-in actions
│   │   │   │   ├── http.ts       # http-get action
│   │   │   │   ├── json.ts       # json-path action
│   │   │   │   ├── html.ts       # css-select action
│   │   │   │   ├── regex.ts      # regex-match action
│   │   │   │   └── dns.ts        # dns-txt action (Node only)
│   │   │   ├── types.ts          # Recipe, Step, Result types
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── lexicon/                 # Lexicon definitions
│   │   ├── org/
│   │   │   └── [domain]/
│   │   │       └── identity/
│   │   │           └── claim.json
│   │   └── package.json
├── apps/
│   ├── keytrace.dev/                     # Main website (Nuxt)
│   │   ├── pages/
│   │   │   ├── index.vue        # Landing page
│   │   │   ├── [did].vue        # Profile view (e.g., /did:plc:xxx)
│   │   │   ├── @[handle].vue    # Profile view by handle
│   │   │   ├── add.vue          # Add new claim wizard
│   │   │   └── settings.vue     # Manage your claims
│   │   ├── server/
│   │   │   ├── api/
│   │   │   │   ├── proxy/
│   │   │   │   │   ├── http.post.ts    # Proxied HTTP fetches
│   │   │   │   │   └── dns.get.ts      # DNS TXT lookups
│   │   │   │   ├── verify.post.ts      # Full server-side verification
│   │   │   │   └── claims/             # Claim management endpoints
│   │   │   └── utils/
│   │   │       ├── oauth.ts     # ATProto OAuth client
│   │   │       ├── storage.ts   # S3 storage for keys/sessions
│   │   │       └── signing.ts   # JWS signing utilities
│   │   ├── package.json
│   │   └── nuxt.config.ts
│
├── package.json                 # Workspace root
├── pnpm-workspace.yaml
└── turbo.json
```

## Lexicon Definition

File: `packages/lexicon/org/[domain]/identity/claim.json`

```json
{
  "lexicon": 1,
  "id": "org.[domain].identity.claim",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "description": "An identity claim linking this DID to an external account",
      "record": {
        "type": "object",
        "required": ["claimUri", "createdAt"],
        "properties": {
          "claimUri": {
            "type": "string",
            "description": "The identity claim URI (e.g., https://github.com/username, dns:example.com)"
          },
          "comment": {
            "type": "string",
            "maxLength": 256,
            "description": "Optional user-provided label for this claim"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```

This will need work, but is a fine start

## Keytrace Runner

### 1. Profile Loading

```typescript
// packages/keytrace-runner/src/profile.ts

import { Agent } from "@atproto/api";

export interface Profile {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  claims: string[]; // claim URIs
}

export async function fetchProfile(didOrHandle: string): Promise<Profile> {
  const agent = new Agent({ service: "https://public.api.bsky.app" });

  // Resolve handle to DID if needed
  let did = didOrHandle;
  if (!didOrHandle.startsWith("did:")) {
    const resolved = await agent.resolveHandle({ handle: didOrHandle });
    did = resolved.data.did;
  }

  // Fetch profile metadata from Bluesky (optional, for display)
  const bskyProfile = await agent.getProfile({ actor: did }).catch(() => null);

  // List all claim records
  const records = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: "org.[domain].identity.claim",
    limit: 100,
  });

  return {
    did,
    handle: bskyProfile?.data.handle ?? did,
    displayName: bskyProfile?.data.displayName,
    avatar: bskyProfile?.data.avatar,
    claims: records.data.records.map((r) => r.value.claimUri),
  };
}
```

### 2. Claim Functions

```typescript
// packages/keytrace-runner/src/claim.ts

export interface Claim {
  uri: string;
  did: string;
  status: ClaimStatus;
  matches: ServiceProviderMatch[];
}

export function createClaim(uri: string, did: string): Claim {
  if (!did.startsWith("did:")) {
    throw new Error("Invalid DID format");
  }
  return { uri, did, status: "pending", matches: [] };
}

export function matchClaim(claim: Claim): Claim {
  // find matching service providers, return updated claim
  const matches = findMatchingProviders(claim.uri);
  return { ...claim, matches };
}

export async function verifyClaim(claim: Claim, opts?: VerifyOptions): Promise<Claim> {
  // For each matched service provider:
  // 1. Fetch proof location
  // 2. Look for DID (or handle, or profile URL) in response
  const patterns = generateProofPatterns(claim.did);
  // ... verification logic
  return { ...claim, status: "verified" };
}

function generateProofPatterns(did: string): string[] {
  return [
    did, // did:plc:xxx
    did.replace("did:plc:", ""), // just xxx
    `https://[SITE_DOMAIN]/${did}`, // profile URL
  ];
}
```

### 3. Service Provider Adjustments

Most service providers can stay the same. Main change is what they look for in proofs:

```typescript
// packages/keytrace-runner/src/providers/github.ts

export const github: ServiceProvider = {
  name: "GitHub",
  id: "github",

  // Regex to match GitHub profile URLs
  repiUri: /^https:\/\/github\.com\/([^/]+)\/?$/,

  // How to fetch the proof
  proof: {
    request: {
      // Fetch the user's gist or profile README
      uri: "https://api.github.com/users/{username}/gists",
      // or check bio via API
    },
    response: {
      format: "json",
    },
    // Where to look for the proof in the response
    target: [["description"], ["files", "*", "content"]],
  },

  // Generate the claim text user should add
  getProofText(did: string): string {
    return did; // or a URL to their profile
  },
};
```

## Website Routes

### Public Routes

| Route                       | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `/`                         | Landing page, recent claims feed, search box   |
| `/did:plc:xxx`              | View profile by DID                            |
| `/@handle.bsky.social`      | View profile by handle (redirects or resolves) |
| `/verify?claim=...&did=...` | One-off verification check                     |
| `/guide/[service]`          | How to add proof for a specific service        |

### Authenticated Routes

| Route            | Purpose                               |
| ---------------- | ------------------------------------- |
| `/auth/login`    | Start OAuth flow                      |
| `/auth/callback` | OAuth callback                        |
| `/dashboard`     | View your claims, verification status |
| `/add`           | Wizard to add new claim               |
| `/add/[service]` | Service-specific instructions         |
| `/remove/[rkey]` | Delete a claim                        |

## OAuth Scopes

**Minimal scope:**

```
atproto
```

The `atproto` scope is the only required scope. It grants access to the user's repo for writing `dev.keytrace.claim` records.

**Note:** `transition:generic` is only needed for apps migrating from app passwords. As a new OAuth-native app, keytrace can omit it.

ATProto OAuth doesn't yet support fine-grained collection-level scopes (e.g., "only write to `dev.keytrace.*`"). The `atproto` scope grants full repo access, but keytrace only writes to its own collection.

## Homepage Recent Claims Feed

The homepage displays a feed of recent successful attestations to show activity and build trust.

**Storage:** `s3://{bucket}/recent-claims.json`

```typescript
interface RecentClaim {
  did: string;
  handle: string;
  avatar?: string;
  type: string; // e.g., "github-gist"
  subject: string; // e.g., "github:octocat"
  displayName: string; // e.g., "GitHub Account"
  createdAt: string;
}

// Array of last 50 claims, newest first
type RecentClaimsFeed = RecentClaim[];
```

**Update flow:**

1. After successful attestation, append to feed
2. Trim to 50 items
3. Write back to S3

```typescript
// server/utils/recent-claims.ts
async function addRecentClaim(claim: RecentClaim): Promise<void> {
  const feed = (await getRecentClaimsFromS3()) ?? [];
  feed.unshift(claim);
  if (feed.length > 50) feed.length = 50;
  await saveRecentClaimsToS3(feed);
}
```

**Homepage rendering:**

- Server-side fetch from S3 on page load
- Shows handle, avatar, claim type icon, and relative time
- Links to user's profile page

## Proxy API Endpoints (embedded in keytrace.dev)

The proxy is built into the Nuxt server, not a separate service:

```
POST /api/proxy/http
    Body: { url: string, method?: string, headers?: object }
    → Proxied fetch with CORS handled server-side
    → Rate limited per IP
    → Domain allowlist for security

GET /api/proxy/dns?domain=example.com
    → Returns TXT records
    → Used for DNS-based claim verification

POST /api/verify
    Body: { recipe: string, params: object, claimId: string }
    → Full server-side verification using keytrace-runner
    → Returns step-by-step verification result
    → On success, can create attestation (if authenticated)
```

**Browser usage:** The keytrace-runner in browser mode uses these endpoints:

```typescript
const runner = createRunner({
  fetch: (url, init) =>
    fetch("/api/proxy/http", {
      method: "POST",
      body: JSON.stringify({ url, ...init }),
    }).then((r) => r.json()),
});
```

## Implementation Phases

### Phase 1: Core Library

1. Build keytrace-runner package
2. Implement recipe execution engine
3. Implement ATProto profile fetching
4. Build verification actions (http-get, json-path, css-select, regex-match, dns-txt)
5. Test with GitHub and DNS recipes

### Phase 2: Proxy Server

1. Set up basic Hono/Express server
2. Implement DNS lookup endpoint
3. Implement HTTP proxy endpoint (with domain allowlist)
4. Implement full verification endpoint
5. Add rate limiting, caching

### Phase 3: Website MVP

1. Profile viewing (read-only, no auth)
2. Handle → DID resolution
3. Display claims with verification status
4. Nice UI for verified/unverified/pending states

### Phase 4: Claim Management

1. OAuth implementation
2. Dashboard to view your claims
3. "Add claim" wizard
4. Service-specific guides with copy-paste proof text
5. Delete claim functionality

### Phase 5: Polish

1. Onboarding flow improvements
2. Real-time verification status updates
3. Share/embed profile cards
4. API for third parties

## Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Language**: TypeScript throughout
- **Web framework**: Nuxt 3 (Vue 3, SSR, Nitro server)
- **UI Components**: Reka UI (headless Vue components)
- **Styling**: Tailwind
- **ATProto**: `@atproto/api` package
- **Deployment**: Railway

## Service Providers to Support (Priority Order)

### P0 (Launch)

- DNS (domain ownership)
- GitHub

## Example User Flow

1. User visits site, clicks "Sign in with Bluesky"
2. OAuth flow, user grants permission
3. Dashboard shows "No claims yet"
4. User clicks "Add GitHub"
5. Site shows: "Add this to your GitHub bio or a public gist:"
   ```
   did:plc:ewvi7nxzyoun6zhxrhs64oiz
   ```
6. User adds it to their GitHub bio
7. User clicks "Verify"
8. Site checks GitHub API, finds DID in bio
9. Site creates claim record in user's ATProto repo
10. Profile page now shows verified GitHub link

## Notes

- The claim record in ATProto is the SOURCE OF TRUTH for "what claims does this user make"
- Verification is done on-demand (not stored) - keeps data fresh
- Users can delete claims anytime by deleting the record
- Third parties can verify claims using just keytrace-runner + a DID

---

## Keytrace Attestation System

This section describes the keytrace-specific attestation architecture, where keytrace acts as a trusted third-party verifier that signs claims on behalf of users.

### Core Concepts

#### 1. Daily Rotating Signing Keys

Keytrace maintains a daily rotating key stored in the keytrace Bluesky account's repository. This provides:

- **Temporal binding** - claims are tied to a specific verification date
- **Key compromise recovery** - if a key is compromised, only that day's claims are affected
- **Public auditability** - anyone can fetch the key to verify signatures

**Lexicon: `dev.keytrace.key`**

```json
{
  "lexicon": 1,
  "id": "dev.keytrace.key",
  "defs": {
    "main": {
      "type": "record",
      "key": "any",
      "description": "A daily signing key for claim attestations. Record key is the date in YYYY-MM-DD format.",
      "record": {
        "type": "object",
        "required": ["publicJwk", "validFrom", "validUntil"],
        "properties": {
          "publicJwk": {
            "type": "object",
            "description": "JWK public key (RFC 7517 format)"
          },
          "validFrom": {
            "type": "string",
            "format": "datetime"
          },
          "validUntil": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    }
  }
}
```

Keys are stored at: `at://did:plc:hcwfdlmprcc335oixyfsw7u3/dev.keytrace.key/2026-02-08`

**Key Storage:**

- **Public keys**: Stored in keytrace's ATProto repo (publicly discoverable)
- **Private keys**: Stored in S3 at `s3://{bucket}/keys/{date}.jwk` (e.g., `keys/2026-02-08.jwk`)

**Key Rotation (lazy generation on Railway):**

Since Railway doesn't have built-in cron, keys are generated lazily on first use each day:

```typescript
// server/utils/keys.ts
async function getOrCreateTodaysKey(): Promise<JWK> {
  const today = new Date().toISOString().split("T")[0]; // "2026-02-08"

  // Try S3 first (fast path)
  let privateKey = await getKeyFromS3(`keys/${today}.jwk`);
  if (privateKey) return privateKey;

  // Generate new key pair for today
  privateKey = await generateES256KeyPair();

  // Save private key to S3
  await saveKeyToS3(`keys/${today}.jwk`, privateKey);

  // Publish public key to ATProto
  await publishKeyToATProto(today, privateKey);

  return privateKey;
}
```

This approach:

- No separate cron service needed
- Keys created on-demand when first attestation is requested
- S3 acts as cache to avoid regenerating on each request
- Works seamlessly with Railway's ephemeral containers

**Publishing to keytrace's repo:**

Uses an app password (not OAuth) to write keys and recipes to keytrace's ATProto repo:

```bash
KEYTRACE_DID=did:plc:hcwfdlmprcc335oixyfsw7u3
KEYTRACE_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

```typescript
// server/utils/keytrace-agent.ts
import { Agent } from "@atproto/api";

let _agent: Agent | null = null;

export async function getKeytraceAgent(): Promise<Agent> {
  if (!_agent) {
    const config = useRuntimeConfig();
    _agent = new Agent({ service: "https://bsky.social" });
    await _agent.login({
      identifier: config.keytraceDid,
      password: config.keytraceAppPassword,
    });
  }
  return _agent;
}
```

#### 2. Claim Recipes

Recipes are public, version-controlled instructions for how to verify a specific claim type. They're stored in keytrace's ATProto repo and referenced by CID for integrity.

**Lexicon: `dev.keytrace.recipe`**

```json
{
  "lexicon": 1,
  "id": "dev.keytrace.recipe",
  "defs": {
    "main": {
      "type": "record",
      "key": "any",
      "description": "A claim verification recipe. Record key should be kebab-case (e.g., 'github-gist', 'dns-txt').",
      "record": {
        "type": "object",
        "required": ["type", "version", "displayName", "instructions", "verification"],
        "properties": {
          "type": {
            "type": "string",
            "description": "Claim type identifier (e.g., 'github', 'dns', 'mastodon')"
          },
          "version": {
            "type": "integer",
            "description": "Recipe version for breaking changes"
          },
          "displayName": {
            "type": "string",
            "description": "Human-readable name (e.g., 'GitHub Account')"
          },
          "params": {
            "type": "array",
            "items": { "type": "ref", "ref": "#param" },
            "description": "User-provided parameters needed for verification"
          },
          "instructions": {
            "type": "ref",
            "ref": "#instructions"
          },
          "verification": {
            "type": "ref",
            "ref": "#verification"
          }
        }
      }
    },
    "param": {
      "type": "object",
      "description": "A user-provided parameter for the claim",
      "required": ["key", "label", "type"],
      "properties": {
        "key": {
          "type": "string",
          "description": "Parameter key used in templates (e.g., 'gistUrl', 'domain')"
        },
        "label": {
          "type": "string",
          "description": "Human-readable label (e.g., 'Gist URL', 'Domain name')"
        },
        "type": {
          "type": "string",
          "knownValues": ["url", "text", "domain"],
          "description": "Input type for validation"
        },
        "placeholder": {
          "type": "string",
          "description": "Placeholder text for the input"
        },
        "pattern": {
          "type": "string",
          "description": "Regex pattern to validate input"
        },
        "extractFrom": {
          "type": "string",
          "description": "Regex with capture group to extract subject from param (e.g., extract 'octocat' from gist URL)"
        }
      }
    },
    "instructions": {
      "type": "object",
      "description": "User-facing instructions for making the claim",
      "required": ["steps"],
      "properties": {
        "steps": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Ordered steps the user must follow"
        },
        "proofTemplate": {
          "type": "string",
          "description": "Template for proof content. Supports {claimId}, {did}, {handle}, and param keys"
        },
        "proofLocation": {
          "type": "string",
          "description": "Where to place the proof (e.g., 'Create a public gist')"
        }
      }
    },
    "verification": {
      "type": "object",
      "description": "Machine-readable verification steps",
      "required": ["steps"],
      "properties": {
        "steps": {
          "type": "array",
          "items": { "type": "ref", "ref": "#verificationStep" }
        }
      }
    },
    "verificationStep": {
      "type": "object",
      "required": ["action"],
      "properties": {
        "action": {
          "type": "string",
          "knownValues": ["http-get", "http-paginate", "css-select", "json-path", "regex-match", "dns-txt"]
        },
        "url": {
          "type": "string",
          "description": "URL template with {user}, {claimId} placeholders"
        },
        "selector": {
          "type": "string",
          "description": "CSS selector or JSONPath expression"
        },
        "pattern": {
          "type": "string",
          "description": "Regex pattern to match"
        },
        "pagination": {
          "type": "object",
          "properties": {
            "nextUrl": { "type": "string" },
            "maxPages": { "type": "integer" }
          }
        },
        "expect": {
          "type": "string",
          "description": "What to expect (e.g., 'contains:{claimId}')"
        }
      }
    }
  }
}
```

**Example Recipe: GitHub Gist**

```json
{
  "$type": "dev.keytrace.recipe",
  "type": "github-gist",
  "version": 1,
  "displayName": "GitHub Account (via Gist)",
  "params": [
    {
      "key": "gistUrl",
      "label": "Gist URL",
      "type": "url",
      "placeholder": "https://gist.github.com/octocat/abc123...",
      "pattern": "^https://gist\\.github\\.com/([^/]+)/([a-f0-9]+)$",
      "extractFrom": "^https://gist\\.github\\.com/([^/]+)/"
    }
  ],
  "instructions": {
    "steps": [
      "Go to https://gist.github.com",
      "Create a new public gist",
      "Name the file keytrace.json",
      "Paste the verification content below into the file",
      "Save the gist and paste the URL below"
    ],
    "proofTemplate": "{\n  \"keytrace\": \"{claimId}\",\n  \"did\": \"{did}\"\n}",
    "proofLocation": "Public gist with keytrace.json"
  },
  "verification": {
    "steps": [
      {
        "action": "http-get",
        "url": "{gistUrl}/raw/keytrace.json"
      },
      {
        "action": "json-path",
        "selector": "$.keytrace",
        "expect": "equals:{claimId}"
      },
      {
        "action": "json-path",
        "selector": "$.did",
        "expect": "equals:{did}"
      }
    ]
  }
}
```

Recipes are referenced by strong ref: `at://did:plc:hcwfdlmprcc335oixyfsw7u3/dev.keytrace.recipe/github-gist` + CID

#### 3. Attested Claims

When a user's claim passes verification, keytrace creates a signed attestation record in the USER's repo.

**Lexicon: `dev.keytrace.claim`**

```json
{
  "lexicon": 1,
  "id": "dev.keytrace.claim",
  "defs": {
    "main": {
      "type": "record",
      "key": "tid",
      "description": "An attested identity claim verified by keytrace",
      "record": {
        "type": "object",
        "required": ["type", "subject", "recipe", "attestation", "createdAt"],
        "properties": {
          "type": {
            "type": "string",
            "description": "Claim type (e.g., 'github-gist')"
          },
          "subject": {
            "type": "string",
            "description": "The claimed identity (e.g., 'github:octocat')"
          },
          "recipe": {
            "type": "ref",
            "ref": "com.atproto.repo.strongRef",
            "description": "Strong reference to the recipe used (URI + CID)"
          },
          "attestation": {
            "type": "ref",
            "ref": "#attestation"
          },
          "createdAt": {
            "type": "string",
            "format": "datetime"
          }
        }
      }
    },
    "attestation": {
      "type": "object",
      "description": "Keytrace's cryptographic attestation",
      "required": ["sig", "signingKey", "signedAt"],
      "properties": {
        "sig": {
          "type": "string",
          "description": "JWS compact signature over the claim data"
        },
        "signingKey": {
          "type": "ref",
          "ref": "com.atproto.repo.strongRef",
          "description": "Strong reference to the signing key record"
        },
        "signedAt": {
          "type": "string",
          "format": "datetime"
        }
      }
    }
  }
}
```

### Claim Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INITIATES CLAIM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User selects "GitHub Account (via Gist)" recipe                         │
│                                                                              │
│  2. Keytrace generates a unique claim ID: kt-a1b2c3d4                       │
│                                                                              │
│  3. Keytrace presents instructions + input for required params:             │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │  To verify your GitHub account:                                  │     │
│     │                                                                  │     │
│     │  1. Go to https://gist.github.com                               │     │
│     │  2. Create a new public gist                                    │     │
│     │  3. Name the file: keytrace.json                                │     │
│     │  4. Paste this content:                                         │     │
│     │     {                                                           │     │
│     │       "keytrace": "kt-a1b2c3d4",                                │     │
│     │       "did": "did:plc:abc123"                                   │     │
│     │     }                                                           │     │
│     │  5. Save the gist                                               │     │
│     │                                                                  │     │
│     │  Gist URL: [____________________________________] (user input)  │     │
│     │  [Verify]                                                        │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  4. User creates gist, pastes URL, clicks Verify                            │
│     → gistUrl = "https://gist.github.com/octocat/abc123"                    │
│     → subject extracted from URL: "github:octocat"                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KEYTRACE RUNS VERIFICATION                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Claims Runner executes recipe with user-provided params:                   │
│                                                                              │
│  Step 1: HTTP GET {gistUrl}/raw/keytrace.json                               │
│          → https://gist.github.com/octocat/abc123/raw/keytrace.json         │
│          → { "keytrace": "kt-a1b2c3d4", "did": "did:plc:abc123" }           │
│                                                                              │
│  Step 2: Verify $.keytrace equals claimId                                   │
│          → "kt-a1b2c3d4" === "kt-a1b2c3d4" ✓                                │
│                                                                              │
│  Step 3: Verify $.did equals user's DID                                     │
│          → "did:plc:abc123" === "did:plc:abc123" ✓                                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      KEYTRACE CREATES ATTESTATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Fetch today's signing key from keytrace's repo                          │
│                                                                              │
│  2. Build claim data:                                                       │
│     {                                                                       │
│       "type": "github-gist",                                                │
│       "subject": "github:octocat",                                          │
│       "did": "did:plc:abc123",                                              │
│       "verifiedAt": "2025-02-08T12:00:00Z"                                  │
│     }                                                                       │
│                                                                              │
│  3. Sign with today's key (ES256 JWS):                                      │
│     sig = sign(canonicalize(claimData), todaysPrivateKey)                   │
│                                                                              │
│  4. Create record in USER's repo via OAuth:                                 │
│     PUT /xrpc/com.atproto.repo.putRecord                                    │
│     {                                                                       │
│       repo: "did:plc:abc123",                                               │
│       collection: "dev.keytrace.claim",                                     │
│       record: {                                                             │
│         type: "github-gist",                                                │
│         subject: "github:octocat",                                          │
│         recipe: {                                                           │
│           uri: "at://did:plc:hcwfdlmprcc335oixyfsw7u3/dev.keytrace.recipe/github-gist",            │
│           cid: "bafyrei..."                                                 │
│         },                                                                  │
│         attestation: {                                                      │
│           sig: "eyJhbGciOiJFUzI1NiIs...",                                   │
│           signingKey: {                                                     │
│             uri: "at://did:plc:hcwfdlmprcc335oixyfsw7u3/dev.keytrace.key/2026-02-08",           │
│             cid: "bafyabc..."                                               │
│           },                                                                │
│           signedAt: "2025-02-08T12:00:00Z"                                  │
│         },                                                                  │
│         createdAt: "2025-02-08T12:00:00Z"                                   │
│       }                                                                     │
│     }                                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Keytrace Runner Library

A generic recipe execution engine that works in **both Node and Browser** environments.

```typescript
// packages/keytrace-runner/src/index.ts

/** Injected fetch function - allows caller to provide proxy, auth, etc. */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface RunnerConfig {
  /** Custom fetch function (defaults to global fetch) */
  fetch?: FetchFn;
  /** Request timeout in ms */
  timeout?: number;
}

export interface ClaimContext {
  /** Unique claim ID for this verification attempt */
  claimId: string;
  /** User's ATProto DID */
  did: string;
  /** User's ATProto handle */
  handle: string;
  /** User-provided params from recipe (e.g., { gistUrl: "..." }) */
  params: Record<string, string>;
}

export interface VerificationResult {
  success: boolean;
  steps: StepResult[];
  /** Extracted subject from params (e.g., "github:octocat") */
  subject?: string;
  error?: string;
}

export interface StepResult {
  action: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function runRecipe(recipe: Recipe, context: ClaimContext, config?: RunnerConfig): Promise<VerificationResult>;
```

**Environment support:**

- **Browser**: Uses native `fetch`, `DOMParser` for HTML parsing
- **Node**: Uses `fetch` (Node 18+), `linkedom` for HTML parsing

**Built-in actions:**

- `http-get` - Fetch URL using injected fetch function
- `css-select` - Parse HTML and run CSS selectors
- `json-path` - Extract data from JSON
- `regex-match` - Match content against regex
- `dns-txt` - DNS TXT lookup (Node only, throws in browser)

**Template interpolation:**
All URL and pattern strings support `{variable}` interpolation from context:

- `{claimId}`, `{did}`, `{handle}` - from ClaimContext
- `{paramKey}` - from user-provided params

### Keytrace DID Reference

All keys and recipes reference keytrace's DID, allowing anyone to:

1. **Discover keys**: `listRecords(keytraceDid, "dev.keytrace.key")`
2. **Discover recipes**: `listRecords(keytraceDid, "dev.keytrace.recipe")`
3. **Verify attestations**: Fetch the signing key by its strong ref, verify the JWS

The keytrace DID should be well-known and potentially pinned in client code for security.

### Security Considerations

1. **Recipe immutability**: Recipes are referenced by CID, so changing a recipe doesn't affect existing claims
2. **Key rotation**: Daily keys limit exposure if a key is compromised
3. **User ownership**: Claims live in the user's repo, portable with their PDS
4. **Proxy isolation**: HTTP fetches go through keytrace's proxy to prevent SSRF
5. **Rate limiting**: Verification endpoints must be rate-limited
6. **Claim ID entropy**: CUIDs provide sufficient entropy to prevent guessing

### Implementation Order

1. **Phase A: Key Infrastructure**
   - Create `dev.keytrace.key` lexicon
   - Implement daily key rotation (cron job)
   - Key generation and storage
   - Public key endpoint/discovery

2. **Phase B: Recipe System**
   - Create `dev.keytrace.recipe` lexicon
   - Build recipe editor/manager
   - Implement GitHub recipe as first example
   - Recipe versioning strategy

3. **Phase C: Claims Runner**
   - HTTP fetcher with proxy support
   - HTML parsing (cheerio)
   - JSON path queries
   - Recipe execution engine
   - Step-by-step result reporting

4. **Phase D: Attestation Creation**
   - Signing infrastructure (ES256 JWS)
   - `dev.keytrace.claim` lexicon
   - OAuth scope for writing to user repos
   - Claim creation flow

5. **Phase E: Verification Display**
   - Fetch and display user claims
   - Verify attestation signatures
   - Show recipe used + version
   - Re-verification option
