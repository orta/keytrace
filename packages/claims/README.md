# @keytrace/claims

Get Keytrace identity claims, and also verify their signatures. Works in both browser and Node.js.

## Installation

```bash
npm install @keytrace/claims
```

## Usage

```typescript
import { getClaimsForHandle, getClaimsForDid } from '@keytrace/claims';

// Verify all claims for a handle
const result = await getClaimsForHandle('alice.bsky.social');

console.log(`${result.summary.verified}/${result.summary.total} claims verified`);

for (const claim of result.claims) {
  if (claim.verified) {
    console.log(`✓ ${claim.type}: ${claim.identity.subject}`);
  } else {
    console.log(`✗ ${claim.type}: ${claim.error}`);
  }
}

// Or verify by DID directly
const result2 = await getClaimsForDid('did:plc:abc123');
```

## API

### `getClaimsForHandle(handle, options?)`

Verify all keytrace claims for an ATProto handle.

```typescript
const result = await getClaimsForHandle('alice.bsky.social');
```

### `getClaimsForDid(did, options?)`

Verify all keytrace claims for a DID.

```typescript
const result = await getClaimsForDid('did:plc:abc123');
```

### Options

```typescript
interface VerifyOptions {
  fetch?: typeof fetch;        // Custom fetch function
  timeout?: number;            // Request timeout in ms (default: 10000)
  plcDirectoryUrl?: string;    // PLC directory URL (default: https://plc.directory)
  publicApiUrl?: string;       // Public API URL (default: https://public.api.bsky.app)
}
```

### Return Type

```typescript
interface VerificationResult {
  did: string;
  handle?: string;
  claims: ClaimVerificationResult[];
  summary: {
    total: number;
    verified: number;
    failed: number;
  };
}

interface ClaimVerificationResult {
  uri: string;                 // AT URI of the claim
  rkey: string;                // Record key
  type: string;                // Claim type (github, dns, etc.)
  claimUri: string;            // The claimed identity URI
  verified: boolean;           // Whether signature is valid
  steps: VerificationStep[];   // Verification steps performed
  error?: string;              // Error message if failed
  identity: ClaimIdentity;     // Identity info from the claim
  claim: ClaimRecord;          // Full claim record
}
```

## How It Works

1. Resolves the handle to a DID (if needed)
2. Fetches the user's PDS endpoint from their DID document
3. Lists all `dev.keytrace.claim` records from their repo
4. For each claim:
   - Fetches the signing key from the primary signature's `src` AT URI
   - Reconstructs the signed claim data
   - Verifies the ES256 signature using Web Crypto API

## Platform Support

- Node.js 18+
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Deno, Cloudflare Workers, and other runtimes with Web Crypto API

Zero runtime dependencies - uses standard `fetch` and `crypto.subtle` APIs.
