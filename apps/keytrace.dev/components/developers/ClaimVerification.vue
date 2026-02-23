<template>
  <div class="border border-zinc-800 rounded-lg overflow-hidden">
    <button
      class="w-full flex items-center justify-between p-4 bg-kt-surface hover:bg-zinc-800/50 transition-colors text-left"
      @click="expanded = !expanded"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center"
          :class="claim.verified ? 'bg-verified/20' : 'bg-failed/20'"
        >
          <CheckIcon v-if="claim.verified" class="w-4 h-4 text-verified" />
          <XIcon v-else class="w-4 h-4 text-failed" />
        </div>
        <div>
          <span class="font-mono text-sm text-zinc-200">{{ claim.type }}:{{ claim.identity.subject }}</span>
        </div>
      </div>
      <ChevronDownIcon
        class="w-4 h-4 text-zinc-500 transition-transform"
        :class="{ 'rotate-180': expanded }"
      />
    </button>

    <div v-if="expanded" class="border-t border-zinc-800 p-4 space-y-4 bg-kt-inset">
      <div
        v-for="(step, index) in claim.steps"
        :key="step.step"
        class="relative"
      >
        <!-- Step header -->
        <div class="flex items-start gap-3">
          <div class="flex flex-col items-center">
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              :class="step.success ? 'bg-verified/20' : 'bg-failed/20'"
            >
              <CheckIcon v-if="step.success" class="w-3 h-3 text-verified" />
              <XIcon v-else class="w-3 h-3 text-failed" />
            </div>
            <div
              v-if="index < claim.steps.length - 1"
              class="w-px flex-1 bg-zinc-700 mt-1 min-h-[16px]"
            />
          </div>
          <div class="flex-1 min-w-0 pb-3">
            <div class="font-mono text-xs text-zinc-400 mb-1">{{ formatStepName(step.step) }}</div>
            <div class="text-xs text-zinc-500">
              {{ step.detail || step.error }}
            </div>

            <!-- Step-specific data display -->
            <div v-if="step.success" class="mt-2">
              <!-- validate_claim: Show signature structure -->
              <template v-if="step.step === 'validate_claim'">
                <div class="bg-zinc-900 border border-zinc-800 rounded p-2 overflow-x-auto">
                  <pre class="text-xs font-mono text-zinc-400"><span class="text-zinc-500">attestSig = </span>{
  <span class="text-violet-400">src</span>: <span class="text-green-400">"{{ truncate(primarySig?.src ?? '', 50) }}"</span>,
  <span class="text-violet-400">signedAt</span>: <span class="text-green-400">"{{ primarySig?.signedAt }}"</span>,
  <span class="text-violet-400">attestation</span>: <span class="text-green-400">"{{ truncate(primarySig?.attestation ?? '', 40) }}..."</span>
}</pre>
                </div>
              </template>

              <!-- fetch_key: Show the AT URI -->
              <template v-else-if="step.step === 'fetch_key'">
                <div class="bg-zinc-900 border border-zinc-800 rounded p-2 overflow-x-auto">
                  <pre class="text-xs font-mono"><span class="text-zinc-500">// Fetched from AT URI:</span>
<a :href="`https://pdsls.dev/${primarySig?.src}`" target="_blank" rel="noopener" class="text-violet-400 hover:text-violet-300 underline">{{ primarySig?.src }}</a>

<span class="text-zinc-500">// Returns KeyRecord with publicJwk</span></pre>
                </div>
              </template>

              <!-- parse_key: Show key format -->
              <template v-else-if="step.step === 'parse_key'">
                <div class="bg-zinc-900 border border-zinc-800 rounded p-2 overflow-x-auto">
                  <pre v-if="keyData" class="text-xs font-mono text-zinc-400"><span class="text-zinc-500">// Parsed ES256 public key from KeyRecord.publicJwk</span>
{
  <span class="text-violet-400">kty</span>: <span class="text-green-400">"{{ keyData.kty }}"</span>,
  <span class="text-violet-400">crv</span>: <span class="text-green-400">"{{ keyData.crv }}"</span>,
  <span class="text-violet-400">x</span>: <span class="text-green-400">"{{ keyData.x }}"</span>,
  <span class="text-violet-400">y</span>: <span class="text-green-400">"{{ keyData.y }}"</span>
}</pre>
                  <pre v-else-if="keyLoading" class="text-xs font-mono text-zinc-500">Loading key data...</pre>
                  <pre v-else class="text-xs font-mono text-zinc-400"><span class="text-zinc-500">// ES256 public key (P-256 curve)</span>
{
  <span class="text-violet-400">kty</span>: <span class="text-green-400">"EC"</span>,
  <span class="text-violet-400">crv</span>: <span class="text-green-400">"P-256"</span>,
  <span class="text-violet-400">x</span>: <span class="text-green-400">"..."</span>,
  <span class="text-violet-400">y</span>: <span class="text-green-400">"..."</span>
}</pre>
                </div>
              </template>

              <!-- reconstruct_data: Show the canonical signed data -->
              <template v-else-if="step.step === 'reconstruct_data'">
                <div class="bg-zinc-900 border border-zinc-800 rounded p-2 overflow-x-auto">
                  <pre class="text-xs font-mono text-zinc-400"><span class="text-zinc-500">// Canonical data that was signed:</span>
<span class="text-violet-400">SignedClaimData</span> = {
<template v-for="(field, i) in reconstructedFields" :key="field.key">  <span class="text-violet-400">{{ field.key }}</span>: <span class="text-green-400">"{{ field.value }}"</span>{{ i < reconstructedFields.length - 1 ? ',' : '' }}
</template>}</pre>
                </div>
              </template>

              <!-- verify_signature: Show signature verification -->
              <template v-else-if="step.step === 'verify_signature'">
                <div class="bg-zinc-900 border border-zinc-800 rounded p-2 overflow-x-auto">
                  <pre class="text-xs font-mono text-zinc-400"><span class="text-zinc-500">// JWS Compact Serialization (ES256):</span>
<span class="text-violet-400">header</span>.<span class="text-yellow-400">payload</span>.<span class="text-green-400">signature</span>

<span class="text-zinc-500">// Attestation:</span>
{{ formatJws(primarySig?.attestation ?? '') }}

<span class="text-zinc-500">// Verification:</span>
<span class="text-verified">crypto.subtle.verify("ES256", publicKey, signature, payload)</span></pre>
                </div>
              </template>
            </div>

            <!-- Error display -->
            <div v-else-if="step.error" class="mt-2 bg-failed/10 border border-failed/20 rounded p-2">
              <pre class="text-xs font-mono text-failed">{{ step.error }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check as CheckIcon, X as XIcon, ChevronDown as ChevronDownIcon } from "lucide-vue-next";
import type { ClaimVerificationResult } from "@keytrace/claims";
import { getPrimarySig } from "@keytrace/claims";

interface ES256PublicJwk {
  kty: string;
  crv: string;
  x: string;
  y: string;
}

const props = defineProps<{
  claim: ClaimVerificationResult;
  did: string;
  defaultExpanded?: boolean;
}>();

const expanded = ref(props.defaultExpanded ?? false);
const keyData = ref<ES256PublicJwk | null>(null);
const keyLoading = ref(false);

/** Primary signature from the claim record (supports both old sig and new sigs format) */
const primarySig = computed(() => getPrimarySig(props.claim.claim));

/** Reconstruct the signed fields from the sig's signedFields, mapping to actual record values */
const reconstructedFields = computed(() => {
  const sig = primarySig.value;
  const claim = props.claim.claim;
  const fields = sig?.signedFields ?? [];
  const isNewFormat = fields.includes("identity.subject");

  if (isNewFormat) {
    // New format: signedFields tells us exactly which fields were signed
    const valueMap: Record<string, string> = {
      claimUri: claim.claimUri,
      createdAt: sig?.signedAt ?? claim.createdAt,
      did: props.did,
      "identity.subject": claim.identity.subject,
      type: claim.type,
    };
    return fields.sort().map((key) => ({ key, value: valueMap[key] ?? "?" }));
  }

  // Legacy format
  return [
    { key: "did", value: props.did },
    { key: "subject", value: claim.identity.subject },
    { key: "type", value: claim.type },
    { key: "verifiedAt", value: sig?.signedAt ?? "" },
  ];
});

// Fetch the key when expanded
watch(expanded, async (isExpanded) => {
  if (isExpanded && !keyData.value && !keyLoading.value) {
    await fetchKey();
  }
});

// Also fetch immediately if defaultExpanded
onMounted(async () => {
  if (props.defaultExpanded) {
    await fetchKey();
  }
});

async function fetchKey() {
  const sigSrc = primarySig.value?.src;
  if (!sigSrc) return;

  keyLoading.value = true;
  try {
    // Parse AT URI: at://did:plc:xxx/collection/rkey
    const atUri = sigSrc;
    const match = atUri.match(/^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) return;

    const [, repo, collection, rkey] = match;

    // First resolve the PDS for this DID
    let pdsUrl = "https://bsky.social";
    if (repo.startsWith("did:plc:")) {
      const plcResponse = await fetch(`https://plc.directory/${repo}`);
      if (plcResponse.ok) {
        const didDoc = await plcResponse.json();
        const pdsService = didDoc.service?.find(
          (s: { id: string; type: string }) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
        );
        if (pdsService?.serviceEndpoint) {
          pdsUrl = pdsService.serviceEndpoint;
        }
      }
    }

    // Fetch the key record from the correct PDS
    const response = await fetch(
      `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(repo)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.value?.publicJwk) {
        keyData.value = JSON.parse(data.value.publicJwk);
      }
    }
  } catch (e) {
    console.error("Failed to fetch key:", e);
  } finally {
    keyLoading.value = false;
  }
}

function formatStepName(step: string): string {
  return step.replace(/_/g, " ");
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

function formatJws(jws: string): string {
  const parts = jws.split(".");
  if (parts.length !== 3) return jws;

  const [header, payload, sig] = parts;
  const truncatedHeader = header.length > 20 ? header.slice(0, 20) + "..." : header;
  const truncatedPayload = payload.length > 20 ? payload.slice(0, 20) + "..." : payload;
  const truncatedSig = sig.length > 20 ? sig.slice(0, 20) + "..." : sig;

  return `${truncatedHeader}.${truncatedPayload}.${truncatedSig}`;
}
</script>
