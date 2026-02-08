<template>
  <div class="w-full max-w-sm mx-auto rounded-2xl bg-kt-surface border border-zinc-800 overflow-hidden">
    <!-- Header with gradient -->
    <div class="h-16 bg-gradient-to-r from-violet-600/20 to-emerald-600/20" />

    <!-- Avatar overlapping header -->
    <div class="px-4 -mt-8">
      <img
        v-if="avatar"
        :src="avatar"
        :alt="displayName"
        class="w-16 h-16 rounded-full ring-4 ring-kt-surface"
      />
      <div v-else class="w-16 h-16 rounded-full ring-4 ring-kt-surface bg-zinc-800 flex items-center justify-center">
        <UserIcon class="w-6 h-6 text-zinc-600" />
      </div>
    </div>

    <!-- Info -->
    <div class="px-4 pt-2 pb-4">
      <h2 class="text-lg font-semibold text-zinc-100">{{ displayName }}</h2>
      <p class="text-sm text-zinc-500">@{{ handle }}</p>

      <!-- Compact claim list -->
      <div v-if="claims?.length" class="mt-3 space-y-1.5">
        <div
          v-for="claim in claims"
          :key="claim.subject"
          class="flex items-center gap-2 text-sm"
        >
          <CheckCircleIcon
            v-if="claim.status === 'verified'"
            class="w-4 h-4 text-verified flex-shrink-0"
          />
          <ClockIcon
            v-else-if="claim.status === 'pending'"
            class="w-4 h-4 text-pending flex-shrink-0"
          />
          <XCircleIcon
            v-else-if="claim.status === 'failed'"
            class="w-4 h-4 text-failed flex-shrink-0"
          />
          <MinusCircleIcon
            v-else
            class="w-4 h-4 text-zinc-500 flex-shrink-0"
          />
          <span class="text-zinc-300 truncate">{{ claim.subject }}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
        <span class="text-xs text-zinc-600">keytrace.dev</span>
        <span class="text-xs text-zinc-500 font-mono">
          {{ truncateDid(did) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  XCircle as XCircleIcon,
  MinusCircle as MinusCircleIcon,
  User as UserIcon,
} from "lucide-vue-next"

export interface MobileClaim {
  subject: string
  status: "verified" | "pending" | "failed" | "unverified"
}

defineProps<{
  avatar?: string
  displayName: string
  handle: string
  did: string
  claims?: MobileClaim[]
}>()

function truncateDid(did: string) {
  if (did.length <= 20) return did
  return did.slice(0, 12) + "..." + did.slice(-6)
}
</script>
