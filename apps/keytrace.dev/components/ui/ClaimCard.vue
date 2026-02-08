<template>
  <div
    class="group rounded-xl border transition-all duration-200"
    :class="statusClasses"
  >
    <!-- Header row -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
      <div class="flex items-center gap-2.5">
        <!-- Service icon -->
        <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
          <component :is="serviceIcon" class="w-4 h-4 text-zinc-300" />
        </div>
        <span class="text-sm font-semibold text-zinc-200">
          {{ claim.displayName }}
        </span>
      </div>

      <!-- Status badge -->
      <UiStatusBadge :status="claim.status" />
    </div>

    <!-- Body -->
    <div class="px-4 py-3 space-y-1.5">
      <a
        v-if="claim.subject"
        :href="claim.subject"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-violet-400 hover:text-violet-300 font-mono transition-colors"
      >
        {{ claim.subject }}
      </a>

      <div class="flex items-center gap-3 text-xs text-zinc-500">
        <span v-if="claim.recipeName">via {{ claim.recipeName }}</span>
        <template v-if="claim.attestation?.signedAt">
          <span class="text-zinc-700">&middot;</span>
          <span>Attested {{ formatDate(claim.attestation.signedAt) }}</span>
        </template>
      </div>

      <!-- Trust chain (expandable) -->
      <details v-if="claim.status === 'verified' && claim.attestation" class="mt-2">
        <summary class="text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors">
          View attestation details
        </summary>
        <div class="mt-2 p-3 rounded-lg bg-kt-inset font-mono text-xs text-zinc-500 space-y-1">
          <div v-if="claim.attestation.signingKey?.uri">
            Key: {{ truncate(claim.attestation.signingKey.uri) }}
          </div>
          <div v-if="claim.attestation.sig">
            Sig: {{ truncate(claim.attestation.sig, 40) }}
          </div>
          <div v-if="claim.recipe?.cid">
            Recipe CID: {{ truncate(claim.recipe.cid) }}
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { Github, Globe, AtSign, Key } from "lucide-vue-next"

export interface ClaimData {
  displayName: string
  status: "verified" | "pending" | "failed" | "unverified"
  serviceType?: string
  subject?: string
  recipeName?: string
  attestation?: {
    signedAt?: string
    signingKey?: { uri: string }
    sig?: string
  }
  recipe?: {
    cid?: string
  }
}

const props = defineProps<{
  claim: ClaimData
}>()

const serviceIcons: Record<string, any> = {
  github: Github,
  domain: Globe,
  dns: Globe,
  mastodon: AtSign,
  fediverse: AtSign,
}

const serviceIcon = computed(() => serviceIcons[props.claim.serviceType ?? ""] ?? Key)

const statusClasses = computed(() => {
  switch (props.claim.status) {
    case "verified":
      return "border-verified/20 bg-kt-surface hover:border-verified/40 hover:shadow-glow-verified"
    case "pending":
      return "border-pending/20 bg-kt-surface hover:border-pending/40"
    case "failed":
      return "border-failed/20 bg-kt-surface hover:border-failed/40"
    default:
      return "border-zinc-800 bg-kt-surface hover:border-zinc-700"
  }
})

function truncate(str?: string, len = 24) {
  if (!str) return ""
  return str.length > len ? str.slice(0, len) + "..." : str
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
</script>
