<template>
  <div class="group rounded-xl border transition-all duration-200" :class="statusClasses">
    <!-- Header row -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
      <div class="flex items-center gap-2.5">
        <!-- Identity avatar or service icon -->
        <img
          v-if="claim.identity?.avatarUrl"
          :src="claim.identity.avatarUrl"
          :alt="claim.identity.displayName || claim.identity.subject || 'Avatar'"
          class="w-8 h-8 rounded-full object-cover"
        />
        <component v-else-if="claim.serviceType === 'npm' || claim.serviceType === 'tangled'" :is="serviceIcon" class="w-7 h-7 text-zinc-300" />
        <div v-else class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
          <component :is="serviceIcon" class="w-4 h-4 text-zinc-300" />
        </div>
        <div class="min-w-0">
          <span class="text-sm font-semibold text-zinc-200 block truncate">
            {{ claim.identity?.displayName || claim.identity?.subject || claim.displayName }}
          </span>
          <span v-if="claim.comment" class="text-xs text-zinc-500 block truncate">
            {{ claim.comment }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Actions slot -->
        <slot name="actions" />
      </div>
    </div>

    <!-- Body -->
    <div class="px-4 py-3 space-y-1.5">
      <!-- PGP fingerprint display -->
      <template v-if="isPgp">
        <div class="font-mono text-xs text-zinc-400 break-all leading-relaxed">{{ formattedFingerprint }}</div>
        <div class="text-xs text-zinc-500">Key ID: {{ shortFingerprint }}</div>
        <a
          v-if="claim.identity?.profileUrl"
          :href="claim.identity.profileUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          View proof
        </a>
      </template>
      <!-- Standard profile URL display -->
      <a
        v-else-if="claim.identity?.profileUrl || claim.subject"
        :href="claim.identity?.profileUrl || claim.subject"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-violet-400 hover:text-violet-300 font-mono transition-colors block truncate"
      >
        {{ claim.identity?.profileUrl || claim.subject }}
      </a>

      <div class="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
        <NuxtLink v-if="claim.serviceType" :to="`/recipes/${claim.serviceType}`" class="hover:text-zinc-300 transition-colors">
          via {{ claim.recipeName || claim.serviceType }}
        </NuxtLink>
        <span v-else-if="claim.recipeName">via {{ claim.recipeName }}</span>
        <template v-if="claim.createdAt">
          <span v-if="claim.recipeName || claim.serviceType" class="text-zinc-700">&middot;</span>
          <span>Added {{ formatDate(claim.createdAt) }}</span>
        </template>
        <template v-if="claim.attestation?.signedAt">
          <span class="text-zinc-700">&middot;</span>
          <span>Attested {{ formatDate(claim.attestation.signedAt) }}</span>
        </template>
        <template v-if="claim.lastVerifiedAt">
          <span class="text-zinc-700">&middot;</span>
          <span>Last checked {{ formatDate(claim.lastVerifiedAt) }}</span>
        </template>
        <template v-if="claim.status === 'retracted' && claim.failedAt">
          <span class="text-zinc-700">&middot;</span>
          <span>Retracted {{ formatDate(claim.failedAt) }}</span>
        </template>
      </div>

      <!-- Trust chain (expandable) -->
      <details v-if="claim.status === 'verified' && claim.attestation" class="mt-2">
        <summary class="text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors">View attestation details</summary>
        <div class="mt-2 p-3 rounded-lg bg-kt-inset font-mono text-xs text-zinc-500 space-y-1">
          <div v-if="claim.attestation.signingKey?.uri">Key: {{ truncate(claim.attestation.signingKey.uri) }}</div>
          <div v-if="claim.attestation.sig">Sig: {{ truncate(claim.attestation.sig, 40) }}</div>
          <div v-if="claim.recipe?.cid">Recipe CID: {{ truncate(claim.recipe.cid) }}</div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Github, Globe, AtSign, Key, Shield } from "lucide-vue-next";
import NpmIcon from "~/components/icons/NpmIcon.vue";
import TangledIcon from "~/components/icons/TangledIcon.vue";

export interface ClaimIdentity {
  subject?: string;
  avatarUrl?: string;
  profileUrl?: string;
  displayName?: string;
}

export interface ClaimData {
  displayName: string;
  status: "verified" | "pending" | "failed" | "unverified" | "retracted";
  serviceType?: string;
  subject?: string;
  recipeName?: string;
  comment?: string;
  createdAt?: string;
  lastVerifiedAt?: string;
  failedAt?: string;
  identity?: ClaimIdentity;
  attestation?: {
    signedAt?: string;
    signingKey?: { uri: string };
    sig?: string;
  };
  recipe?: {
    cid?: string;
  };
}

const props = defineProps<{
  claim: ClaimData;
}>();

const serviceIcons: Record<string, any> = {
  github: Github,
  domain: Globe,
  dns: Globe,
  mastodon: AtSign,
  fediverse: AtSign,
  npm: NpmIcon,
  tangled: TangledIcon,
  pgp: Shield,
};

const serviceIcon = computed(() => serviceIcons[props.claim.serviceType ?? ""] ?? Key);

const isPgp = computed(() => props.claim.serviceType === "pgp");

const formattedFingerprint = computed(() => {
  const raw = (props.claim.identity?.subject ?? "").replace(/\s+/g, "").toUpperCase();
  if (!raw || raw.length < 8) return raw;
  // Format as 4-char groups with double space at midpoint
  const groups = raw.match(/.{1,4}/g) ?? [];
  const mid = Math.ceil(groups.length / 2);
  return groups.slice(0, mid).join(" ") + "  " + groups.slice(mid).join(" ");
});

const shortFingerprint = computed(() => {
  const raw = (props.claim.identity?.subject ?? "").replace(/\s+/g, "").toUpperCase();
  // Last 16 chars = 64-bit key ID
  return raw.length >= 16 ? raw.slice(-16) : raw;
});

const statusClasses = computed(() => {
  switch (props.claim.status) {
    case "verified":
      return "border-verified/20 bg-kt-surface hover:border-verified/40 hover:shadow-glow-verified";
    case "pending":
      return "border-pending/20 bg-kt-surface hover:border-pending/40";
    case "failed":
      return "border-failed/20 bg-kt-surface hover:border-failed/40";
    case "retracted":
      return "border-zinc-700/50 bg-kt-surface/50 opacity-75";
    default:
      return "border-zinc-800 bg-kt-surface hover:border-zinc-700";
  }
});

function truncate(str?: string, len = 24) {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "..." : str;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
</script>
