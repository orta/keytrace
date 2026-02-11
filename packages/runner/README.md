# @keytrace/runner

Core verification library for Keytrace identity claims. Matches claim URIs to service providers, fetches proofs, and verifies ownership.

This library is still very work in progress, and not fully built out for folks who want to run the full verification proofing system. You can use @keytrace/claims to get a list of claims and verify they are real based on public key encryption.

This would allow you to do the HTTP and DNS requests necessary to make the initial proof.

## Installation

```bash
npm install @keytrace/runner
```

## Usage

### Verify a Claim

```typescript
import { createClaim, verifyClaim, ClaimStatus } from '@keytrace/runner';

// Create and verify a claim
const claim = createClaim('https://gist.github.com/octocat/abc123', 'did:plc:xyz789');
const result = await verifyClaim(claim);

if (result.status === ClaimStatus.VERIFIED) {
  console.log('Claim verified!');
  console.log('Identity:', result.identity);
} else {
  console.log('Verification failed:', result.errors);
}
```

### Fetch a User's Profile and Claims

```typescript
import { fetchProfile, verifyAllClaims, getProfileSummary } from '@keytrace/runner';

// Fetch profile and claims from ATProto
const profile = await fetchProfile('alice.bsky.social');

// Verify all claims
const verified = await verifyAllClaims(profile);

// Get summary
const summary = getProfileSummary(verified);
console.log(`${summary.verified}/${summary.total} claims verified`);
```

### Match URIs to Service Providers

```typescript
import { serviceProviders } from '@keytrace/runner';

const matches = serviceProviders.matchUri('https://gist.github.com/octocat/abc123');
// [{ provider: { id: 'github', name: 'GitHub', ... }, match: [...], isAmbiguous: false }]

const matches2 = serviceProviders.matchUri('dns:example.com');
// [{ provider: { id: 'dns', name: 'Domain', ... }, match: [...], isAmbiguous: false }]
```

## Service Providers

Built-in providers for identity verification:

| Provider | URI Pattern | Proof Location |
|----------|-------------|----------------|
| GitHub | `https://gist.github.com/user/id` | Gist content |
| DNS | `dns:example.com` | TXT record |
| Mastodon | `https://instance/@user` | Profile bio/fields |
| Bluesky | `https://bsky.app/profile/handle` | Profile bio |
| npm | `https://npmjs.com/package/keytrace-handle` | package.json |

## API

### Claims

```typescript
// Create a claim
createClaim(uri: string, did: string): ClaimState

// Match claim to service providers
matchClaim(claim: ClaimState): void

// Verify claim by fetching proof
verifyClaim(claim: ClaimState, options?: VerifyOptions): Promise<ClaimVerificationResult>

// Check if claim matches multiple providers
isClaimAmbiguous(claim: ClaimState): boolean
```

### Profiles

```typescript
// Fetch profile and claims from ATProto
fetchProfile(handleOrDid: string): Promise<FetchedProfile>

// Verify all claims in a profile
verifyAllClaims(profile: FetchedProfile): Promise<FetchedProfile>

// Get verification summary
getProfileSummary(profile: FetchedProfile): { total: number; verified: number; failed: number }
```

### Service Providers

```typescript
import { serviceProviders } from '@keytrace/runner';

// Match URI to providers
serviceProviders.matchUri(uri: string): ServiceProviderMatch[]

// Get all providers
serviceProviders.all: ServiceProvider[]

// Get provider by ID
serviceProviders.get(id: string): ServiceProvider | undefined
```

## Claim Status

```typescript
enum ClaimStatus {
  INIT = 'init',           // Created, not yet matched
  MATCHED = 'matched',     // URI matched to provider
  VERIFIED = 'verified',   // Proof verified successfully
  FAILED = 'failed',       // Proof verification failed
  ERROR = 'error',         // Error during verification
}
```

## Verification Options

```typescript
interface VerifyOptions {
  timeout?: number;        // Request timeout in ms (default: 10000)
  fetch?: typeof fetch;    // Custom fetch function
}
```
