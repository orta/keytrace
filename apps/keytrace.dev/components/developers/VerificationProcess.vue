<template>
  <div class="space-y-4">
    <!-- Step 1: Resolve Handle -->
    <div class="bg-kt-card border border-zinc-800 rounded-lg p-5">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center">
          <span class="text-xs font-bold text-violet-400">1</span>
        </div>
        <h3 class="text-sm font-semibold text-zinc-300">Resolve Handle</h3>
      </div>
      <p class="text-sm text-zinc-400 mb-4">
        The ATProto handle is resolved to a DID using the public API. DIDs are persistent identifiers that remain stable even if the handle changes.
      </p>
      <div class="bg-zinc-900 border border-zinc-800 rounded p-3">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-zinc-500">{{ result.handle || 'handle' }}</span>
          <ArrowRightIcon class="w-4 h-4 text-zinc-600" />
          <span class="font-mono text-violet-400">{{ result.did }}</span>
        </div>
      </div>
      <div class="mt-3 bg-zinc-900/50 border border-zinc-800/50 rounded p-2">
        <code class="text-xs text-zinc-500">result.did <span class="text-zinc-600">//</span> <span class="text-green-400">"{{ result.did }}"</span></code>
      </div>
    </div>

    <!-- Step 2: Locate PDS -->
    <div class="bg-kt-card border border-zinc-800 rounded-lg p-5">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center">
          <span class="text-xs font-bold text-violet-400">2</span>
        </div>
        <h3 class="text-sm font-semibold text-zinc-300">Locate PDS</h3>
      </div>
      <p class="text-sm text-zinc-400 mb-4">
        The DID document tells us where the user's data is stored (their Personal Data Server). This is fetched from the PLC directory.
      </p>
      <div class="bg-zinc-900 border border-zinc-800 rounded p-3">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-zinc-500">PDS:</span>
          <span class="font-mono text-violet-400">{{ pdsUrl }}</span>
        </div>
      </div>
    </div>

    <!-- Step 3: Fetch Claims -->
    <div class="bg-kt-card border border-zinc-800 rounded-lg p-5">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center">
          <span class="text-xs font-bold text-violet-400">3</span>
        </div>
        <h3 class="text-sm font-semibold text-zinc-300">Fetch Claims</h3>
      </div>
      <p class="text-sm text-zinc-400 mb-4">
        We list all <code class="font-mono text-xs bg-zinc-800 px-1 rounded">dev.keytrace.claim</code> records from the user's ATProto repository. Each claim represents a verified external identity.
      </p>
      <div class="bg-zinc-900 border border-zinc-800 rounded p-3">
        <div class="text-sm">
          <span class="text-zinc-500">Found</span>
          <span class="font-mono text-violet-400 mx-1">{{ result.claims.length }}</span>
          <span class="text-zinc-500">{{ result.claims.length === 1 ? 'claim' : 'claims' }}:</span>
          <span class="font-mono text-zinc-400 ml-2">
            {{ result.claims.map(c => c.type).join(', ') }}
          </span>
        </div>
      </div>
      <div class="mt-3 bg-zinc-900/50 border border-zinc-800/50 rounded p-2">
        <code class="text-xs text-zinc-500">result.claims.length <span class="text-zinc-600">//</span> <span class="text-green-400">{{ result.claims.length }}</span></code>
      </div>
    </div>

    <!-- Step 4: Verify Each Claim -->
    <div class="bg-kt-card border border-zinc-800 rounded-lg p-5">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-6 h-6 rounded-full bg-violet-600/20 flex items-center justify-center">
          <span class="text-xs font-bold text-violet-400">4</span>
        </div>
        <h3 class="text-sm font-semibold text-zinc-300">Verify Each Claim</h3>
      </div>
      <p class="text-sm text-zinc-400 mb-4">
        Each claim contains a cryptographic signature that proves Keytrace verified the identity. We verify this signature using the Web Crypto API.
      </p>

      <!-- Claims list -->
      <div v-if="result.claims.length > 0" class="space-y-3 mb-4">
        <ClaimVerification
          v-for="(claim, index) in result.claims"
          :key="claim.uri"
          :claim="claim"
          :did="result.did"
          :default-expanded="index === 0"
        />
      </div>

      <!-- Step explanations -->
      <div class="bg-zinc-900/50 border border-zinc-800/50 rounded p-4 text-xs text-zinc-500 space-y-2">
        <div class="font-semibold text-zinc-400 mb-2">Verification steps:</div>
        <div><span class="font-mono text-zinc-400">validate_claim</span> - Check signature fields exist (sig.src, sig.attestation, sig.signedAt)</div>
        <div><span class="font-mono text-zinc-400">fetch_key</span> - Fetch the ES256 public key from the sig.src AT URI</div>
        <div><span class="font-mono text-zinc-400">parse_key</span> - Parse the JWK and verify it's a P-256 ECDSA key</div>
        <div><span class="font-mono text-zinc-400">reconstruct_data</span> - Rebuild the canonical data: {'{'}did, subject, type, verifiedAt{'}'}</div>
        <div><span class="font-mono text-zinc-400">verify_signature</span> - Verify the ES256 signature using Web Crypto</div>
      </div>
    </div>

    <!-- Summary -->
    <div class="bg-kt-card border border-zinc-800 rounded-lg p-5">
      <div class="flex items-center gap-2 mb-3">
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center"
          :class="result.summary.failed === 0 ? 'bg-verified/20' : 'bg-failed/20'"
        >
          <CheckIcon v-if="result.summary.failed === 0" class="w-4 h-4 text-verified" />
          <XIcon v-else class="w-4 h-4 text-failed" />
        </div>
        <h3 class="text-sm font-semibold text-zinc-300">Summary</h3>
      </div>
      <div class="text-lg font-semibold mb-3">
        <span :class="result.summary.failed === 0 ? 'text-verified' : 'text-zinc-200'">
          {{ result.summary.verified }}/{{ result.summary.total }}
        </span>
        <span class="text-zinc-400 font-normal ml-2">claims verified</span>
      </div>
      <div class="bg-zinc-900/50 border border-zinc-800/50 rounded p-2">
        <code class="text-xs text-zinc-500">result.summary <span class="text-zinc-600">//</span> <span class="text-green-400">{{ JSON.stringify(result.summary) }}</span></code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight as ArrowRightIcon, Check as CheckIcon, X as XIcon } from "lucide-vue-next";
import type { VerificationResult } from "@keytrace/claims";

const props = defineProps<{
  result: VerificationResult;
}>();

const pdsUrl = ref<string>("Resolving...");

// Resolve the PDS URL from the PLC directory
async function resolvePds() {
  const did = props.result.did;
  if (!did) {
    pdsUrl.value = "Unknown";
    return;
  }

  try {
    if (did.startsWith("did:plc:")) {
      const response = await fetch(`https://plc.directory/${did}`);
      if (response.ok) {
        const didDoc = await response.json();
        const pdsService = didDoc.service?.find(
          (s: { id: string; type: string }) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
        );
        if (pdsService?.serviceEndpoint) {
          pdsUrl.value = pdsService.serviceEndpoint;
          return;
        }
      }
    } else if (did.startsWith("did:web:")) {
      const host = did.replace("did:web:", "").replaceAll(":", "/");
      const response = await fetch(`https://${host}/.well-known/did.json`);
      if (response.ok) {
        const didDoc = await response.json();
        const pdsService = didDoc.service?.find(
          (s: { id: string; type: string }) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
        );
        if (pdsService?.serviceEndpoint) {
          pdsUrl.value = pdsService.serviceEndpoint;
          return;
        }
      }
    }
    pdsUrl.value = "https://bsky.social";
  } catch {
    pdsUrl.value = "https://bsky.social";
  }
}

onMounted(() => {
  resolvePds();
});

watch(() => props.result.did, () => {
  resolvePds();
});
</script>
