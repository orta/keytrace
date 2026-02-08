# Devil's Advocate Review: Keytrace

**Reviewer**: Devil's Advocate
**Date**: 2026-02-08
**Scope**: Existential risks, competitive landscape, trust model, sustainability, and architectural concerns

---

## Executive Summary

Keytrace has a clear vision: be "Keybase for Bluesky." The core library (`@keytrace/doip`) is well-structured and the DOIP-inspired service provider architecture is sound. However, this project faces serious headwinds from Bluesky's own verification system, fundamental trust model contradictions, scope creep between plan and reality, and sustainability questions that need honest answers before investing further.

**Verdict**: The project has a viable niche, but only if it narrows its ambitions and confronts the trust model problem head-on. As currently planned, it risks building something that is simultaneously too centralized to satisfy decentralization advocates and too obscure to satisfy mainstream users.

---

## 1. Does This Need to Exist?

### The "Bluesky Already Does This" Problem

Bluesky launched its own multi-tier verification system in April 2025:
- **Domain verification**: 309,000+ accounts already use domain handles
- **Blue checkmarks**: 4,327 accounts verified by end of 2025
- **Trusted Verifiers**: 21 organizations (NYT, CNN, European Commission) can issue verification badges directly in the app
- **Built into the client**: Badges appear natively in all Bluesky clients

Keytrace is building a third-party verification layer on top of a platform that already has two forms of built-in verification. The plan never mentions Bluesky's Trusted Verifiers program, which is a significant oversight.

**Counter-argument**: Bluesky's verification is about "notable" accounts (celebrities, journalists, organizations). Keytrace is about proving cross-platform identity for anyone. These are genuinely different use cases. But the plan should explicitly articulate this distinction.

### The "Keyoxide Already Exists" Problem

Keyoxide already supports Bluesky verification. Users can add their Bluesky profile as a claim on their Keyoxide profile via OpenPGP identity proofs. The DOIP (Decentralized OpenPGP Identity Proofs) specification is mature, with implementations in both JavaScript (doipjs) and Rust (doip-rs).

The naming of `@keytrace/doip` package is telling -- this project is aware of and building on Keyoxide's concepts. But if you're rebuilding doipjs with ATProto as the identity backbone instead of PGP, you should be explicit about what's gained and lost.

**What's gained**: No PGP key management UX nightmare, data lives in user's ATProto repo, portable with PDS.

**What's lost**: PGP-based proofs are cryptographically self-sovereign. The user holds the private key. In Keytrace, the user delegates trust to keytrace.dev as a signing authority. This is a fundamental philosophical regression.

---

## 2. The Trust Model Contradiction

This is the single biggest problem with the project.

### Keytrace is a Trusted Third Party

The plan describes keytrace as a "trusted third-party verifier that signs claims on behalf of users." It generates daily rotating ES256 keys, signs attestations, and writes those attestations to user repos via OAuth.

This means:
- **Users must trust keytrace** to verify claims honestly
- **Users must trust keytrace** with full repo write access
- **Verifiers must trust keytrace's signing keys** to validate attestations
- **Keytrace's DID must be hardcoded/pinned** in client code for security

You've re-invented a Certificate Authority for identity proofs. In a project inspired by Keybase (which was criticized for centralization) and Keyoxide (which was built specifically to avoid centralization), keytrace introduces a new central point of trust and failure.

### The "Keytrace Signs Its Own Attestations" Problem

When keytrace verifies a GitHub gist and signs an attestation, what does that signature actually prove? It proves that at some point in time, keytrace's server successfully fetched a URL and found a matching string. That's it.

An attacker who compromises keytrace's S3 bucket (where private keys are stored) can forge attestations for anyone. An attacker who compromises the server can issue fraudulent attestations in real-time. There's no way for a third party to independently verify the original proof without re-running the verification themselves.

If third parties need to re-run verification anyway (which the plan says should happen: "Verification is done on-demand"), then what value does the signed attestation add? It's a cache of a previous verification result signed by a party you have to trust anyway.

### What Would Fix This

Consider a model where:
1. Users create the claim record themselves (they already have write access to their own repo)
2. Keytrace provides the verification engine (the runner) but doesn't sign anything
3. Anyone can verify by running the recipe against the claim
4. Keytrace.dev is just a convenient UI, not a signing authority

This would be more aligned with the project's stated philosophy and closer to how Keyoxide actually works.

---

## 3. OAuth Scope: The Elephant in the Room

The plan acknowledges this directly:

> ATProto OAuth doesn't yet support fine-grained collection-level scopes. The `atproto` scope grants full repo access, but keytrace only writes to its own collection.

The August 2025 ATProto discussion on auth scopes shows progress toward granular permissions, with draft protocol features published and server-side implementation underway. But as of this writing, keytrace.dev has `scope: "atproto transition:generic"` in its OAuth config (`/apps/keytrace.dev/server/utils/oauth.ts:47`), which grants full read/write access to the user's entire ATProto repository.

This means keytrace could:
- Read all of a user's private messages
- Delete their posts
- Modify their profile
- Create records in any collection

For a verification service, this is an unacceptable level of access. Users who are security-conscious enough to want identity verification proofs are exactly the users who will balk at granting full repo access to a third-party service.

**Mitigation**: The plan should have a concrete strategy for when granular scopes ship. It should also have a prominent disclosure on the auth page explaining what access is being granted and why.

---

## 4. Plan vs. Reality (Scope Creep Analysis)

### What the Plan Describes

The plan describes a system with:
- `keytrace-runner` package with recipe execution engine
- Multiple action types (http-get, json-path, css-select, regex-match, dns-txt, http-paginate)
- Template interpolation with `{variable}` syntax
- Daily rotating signing keys stored in S3
- Signed attestations with JWS
- Recipes stored in keytrace's ATProto repo
- Strong references (URI + CID) for recipe integrity
- Claim IDs with CUID entropy
- Recent claims feed stored in S3
- HTTP proxy with domain allowlist
- 5 implementation phases

### What Actually Exists

- A `@keytrace/doip` package (not `keytrace-runner`) with:
  - 4 service providers (GitHub gists, DNS, ActivityPub, Bluesky)
  - 3 fetchers (HTTP, DNS, ActivityPub)
  - A Claim class that can match and verify
  - A Profile class that fetches from ATProto
- A Nuxt web app with:
  - OAuth login/logout flow
  - Session storage (S3 or file-based)
  - A bare-bones index page showing authenticated user info

### What's Missing

Everything from the attestation system: no signing keys, no recipes stored in ATProto, no JWS signatures, no `dev.keytrace.key` or `dev.keytrace.recipe` or `dev.keytrace.claim` lexicons, no claim creation flow, no verification UI, no proxy endpoints, no recent claims feed.

The lexicon that exists (`dev.keytrace.identity.claim`) is the simple version from the top of the plan, not the attested version from the attestation section.

**The gap between the plan and the code is enormous.** The plan describes a Phase 5 system. The code is at early Phase 1. This isn't inherently bad -- every project starts somewhere -- but the plan should be honest about the critical path and make clear which parts are aspirational vs. committed.

---

## 5. Recipe System: Over-Engineering?

The recipe system described in the plan is a full DSL for verification:
- Parameterized templates
- Multi-step verification pipelines
- CSS selectors, JSONPath, regex matching
- Pagination support
- Recipes stored as ATProto records with CID-based integrity

Meanwhile, the actual code uses a much simpler approach: hardcoded service providers with regex matching and path-based value extraction. This is pragmatic and works.

The question is: does the recipe system justify its complexity?

**Against recipes**: Every recipe is custom logic that needs to be written, tested, and maintained. When GitHub changes their gist API, someone needs to update the recipe. When a service provider changes their HTML structure, the CSS selector breaks. This is the same maintenance burden as hardcoded providers, just expressed in a different format. Recipes in ATProto don't make them more maintainable; they make them less mutable (CID-pinned).

**For recipes**: Recipes are user-auditable. Anyone can read the recipe and understand exactly what keytrace checks. This is genuine transparency value.

**Recommendation**: Keep the current hardcoded provider approach for v1. The recipe system is a v2 feature at best. Don't let the perfect be the enemy of the good.

---

## 6. ATProto Dependency Risks

### Protocol Instability

ATProto is still a moving target. The DID PLC verification method constraints were being relaxed as recently as June 2025. OAuth scopes are still being implemented. The lexicon system may evolve.

Keytrace stores its core data (claims, keys, recipes) as ATProto records. If the protocol changes how custom lexicons work, or if PDS operators decide to reject unknown collections, keytrace's data becomes inaccessible.

### Bluesky Pivot Risk

ATProto and Bluesky are technically separate, but practically coupled. The code hardcodes `https://public.api.bsky.app` as `PUBLIC_API_URL` and `https://bsky.social` as the PDS endpoint. If Bluesky changes its API, the project breaks.

More concerning: Bluesky could decide that third-party verification services compete with their Trusted Verifiers program and make it harder for apps like keytrace to operate (e.g., by restricting what collections third-party OAuth apps can write to).

### Ecosystem Lock-in

By building exclusively on ATProto, keytrace ties its fate to a single protocol. Keyoxide works with PGP keys, which are protocol-agnostic. A keytrace identity proof is meaningless outside the ATProto ecosystem.

---

## 7. Adoption: The Chicken-and-Egg Problem

Identity verification is a network effect business:
- Users won't add proofs if nobody checks them
- Nobody will check them if few users have proofs
- Third-party apps won't integrate if few users have proofs
- Users won't bother if third-party apps don't show verification status

Keybase solved this by bundling verification with encrypted chat, file sharing, and git. It made the verification system a side benefit of an already-useful product.

Keytrace is a pure verification service. The value proposition is: "Prove you own the same GitHub account linked to your Bluesky profile." Who needs this today? Security researchers, journalists, developers. A small niche. The plan's homepage "recent claims feed" showing the last 50 verifications could look very sparse for a very long time.

**Recommendation**: Focus ruthlessly on the developer audience first. Make `@keytrace/doip` an excellent library that other ATProto app developers integrate. The verification UI is secondary to the library being useful in other people's apps.

---

## 8. Failure Modes

### Service Dependencies

| Dependency | Failure Impact |
|-----------|----------------|
| GitHub API | Rate-limited at 60 req/hr unauthenticated. A popular keytrace instance verifying many GitHub claims will hit this fast. |
| S3 (Scaleway) | All sessions lost. No new OAuth logins. No signing keys accessible. Complete outage. |
| public.api.bsky.app | Cannot resolve handles, fetch profiles, or list claims. Complete outage. |
| bsky.social PDS | Cannot write attestations to user repos. Cannot publish keys/recipes. |
| DNS resolution | DNS claim verification fails. |
| Third-party services | Each service provider is a separate failure point. |

### Missing Resilience

The code has no:
- Retry logic on any fetcher
- Circuit breakers for failing services
- Caching of verification results
- Graceful degradation (e.g., showing stale results when a service is down)
- Health check endpoints
- Error tracking/alerting

### S3 as Single Point of Failure

The plan puts everything critical in S3: signing keys, sessions, recent claims feed. S3 is highly available, but the keytrace implementation has no fallback. If S3 credentials expire or the bucket is misconfigured, the entire service is dead.

---

## 9. Security Theater Concerns

### "Verified" Doesn't Mean "Trustworthy"

A keytrace verification proves: "At time T, URL X contained string Y matching DID Z." It does not prove:
- The GitHub account is not compromised
- The person behind the DID is who they claim to be
- The verification is still valid (the gist could be deleted 1 second after verification)

The verification UI should make these limitations crystal clear. A green checkmark next to "GitHub: @alice" could give false confidence.

### Temporal Validity Problem

The plan says "Verification is done on-demand (not stored) - keeps data fresh." But the attestation system signs claims at verification time. If a user removes their proof after getting the attestation, the attestation remains in their repo, signed and "valid." There's no revocation mechanism.

### Proof Squatting

If Alice creates a gist with Bob's DID, and then submits that gist URL as her own claim, keytrace would verify it. The verification checks that the DID appears in the gist, not that the gist belongs to the person making the claim. The `extractFrom` parameter in recipes partially addresses this (extracting username from gist URL), but the current code doesn't verify that the extracted username matches any expected value.

---

## 10. Business Sustainability

### Who Pays?

The plan mentions Railway for hosting, Scaleway S3 for storage. These cost money. The project has:
- No pricing model
- No sponsorship strategy
- No mention of sustainability
- S3 storage that grows linearly with users (sessions, keys)

### Maintenance Burden

Each service provider needs ongoing maintenance:
- GitHub changes their API? Update the provider.
- Mastodon instances have different API versions? Handle edge cases.
- New services to support? Write and test new providers.
- Security vulnerabilities? Patch and redeploy.

This is a significant ongoing commitment for what appears to be a side project.

---

## 11. Specific Code Concerns

### Naming Confusion

The package is called `@keytrace/doip` but the plan describes `keytrace-runner`. The lexicon uses `dev.keytrace.identity.claim` but the plan's attestation section uses `dev.keytrace.claim`. The plan references `org.[domain].identity.claim` as a placeholder. These inconsistencies suggest the design is still in flux.

### Hardcoded Bluesky Dependency

`/packages/doip/src/constants.ts` hardcodes `PUBLIC_API_URL = "https://public.api.bsky.app"`. The plan talks about ATProto portability but the code is Bluesky-specific. A user on a third-party PDS would need their AppView to resolve, which may or may not be public.api.bsky.app.

### Missing Input Validation

The `Claim` constructor validates DID format with just `did.startsWith("did:")`. It doesn't validate:
- DID method (plc, web, key, etc.)
- DID-specific format requirements
- URI format for claim URIs
- Maximum lengths

### Service Provider Ordering Matters

In `/packages/doip/src/serviceProviders/index.ts`, the `matchUri` function iterates providers in insertion order and stops at the first unambiguous match. The order `github, dns, activitypub, bsky` means if a URL somehow matched both github and another provider, only github would be tried. This is fragile -- provider ordering should be explicit and documented.

---

## 12. Recommendations (Constructive)

### Must-Do Before Launch

1. **Resolve the trust model**: Either commit to being a signing authority (and own that responsibility) or remove the attestation system and be a verification engine only
2. **Address OAuth scope disclosure**: Add a prominent explanation of what access is being granted
3. **Plan for granular scopes**: Have migration code ready for when ATProto ships collection-level permissions
4. **Add retry logic and error handling**: The fetchers are too fragile for production

### Should-Do

5. **Differentiate from Bluesky verification explicitly**: The landing page should explain why keytrace exists when Bluesky has verification
6. **Focus on the library first**: Make `@keytrace/doip` the best verification library in the ATProto ecosystem
7. **Skip the recipe system for v1**: Hardcoded providers work fine and are easier to maintain
8. **Add a cache/staleness model**: Decide how long a verification result is valid

### Could-Do

9. **Consider becoming a Bluesky labeler**: Instead of custom attestations, keytrace could label accounts using the existing labeler system, getting native Bluesky UI integration for free
10. **Support verification without OAuth**: Let anyone verify someone else's profile without logging in (read-only verification)
11. **Add webhook/federation**: Let other instances run verification so keytrace.dev isn't a single point of failure

---

## Summary

Keytrace is building something useful at its core: a library and service for cross-platform identity verification on ATProto. The `@keytrace/doip` package is well-structured and the service provider architecture is extensible.

But the project needs to confront three fundamental tensions:

1. **Centralized verifier in a decentralized ecosystem**: The attestation/signing model contradicts the project's philosophical roots
2. **Competing with the platform**: Bluesky's own verification system covers the most visible use case
3. **Plan vs. reality**: The plan describes a much larger system than what exists or may be needed

The path forward is to focus on what keytrace uniquely offers: cross-platform identity verification for everyday users (not just "notable" accounts), packaged as both a library and a simple web UI. Drop the complex attestation system, embrace verification-on-demand, and make the library so good that other ATProto apps want to integrate it.
