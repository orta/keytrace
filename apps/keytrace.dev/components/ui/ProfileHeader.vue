<template>
  <div class="flex items-start gap-5 p-6">
    <!-- Avatar -->
    <img v-if="profile.avatar" :src="profile.avatar" :alt="profile.displayName" class="w-20 h-20 rounded-full ring-2 ring-zinc-800 bg-zinc-900" />
    <div v-else class="w-20 h-20 rounded-full ring-2 ring-zinc-800 bg-zinc-900 flex items-center justify-center">
      <UserIcon class="w-8 h-8 text-zinc-600" />
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <h1 class="text-2xl font-semibold text-zinc-100 tracking-tight">
        {{ profile.displayName }}
      </h1>

      <p class="text-zinc-500 mt-0.5"><span class="text-zinc-600">@</span>{{ profile.handle }}</p>
      <p v-if="profile.description" class="text-sm text-zinc-400 mt-1.5">{{ profile.description }}</p>

      <div class="flex items-center gap-2 mt-1">
        <a
          :href="`https://pdsls.dev/at://${profile.did}/dev.keytrace.claim`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs font-mono text-zinc-500 hover:text-zinc-300 truncate max-w-[280px] transition-colors"
          title="View claims on pdsls.dev"
        >
          {{ profile.did }}
        </a>
        <CopyButton :value="profile.did" />
      </div>

      <!-- Summary badges -->
      <div class="flex items-center gap-2 mt-3">
        <span v-if="verifiedCount > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-verified/10 text-verified text-xs font-medium">
          <CheckCircleIcon class="w-3.5 h-3.5" />
          {{ verifiedCount }} verified
        </span>
        <span v-if="pendingCount > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pending/10 text-pending text-xs font-medium">
          <ClockIcon class="w-3.5 h-3.5" />
          {{ pendingCount }} pending
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { CheckCircle as CheckCircleIcon, Clock as ClockIcon, User as UserIcon } from "lucide-vue-next";

export interface ProfileData {
  avatar?: string;
  displayName: string;
  handle: string;
  did: string;
  description?: string;
}

export interface Claim {
  status: "verified" | "pending" | "failed" | "unverified";
}

const props = defineProps<{
  profile: ProfileData;
  claims?: Claim[];
}>();

const verifiedCount = computed(() => props.claims?.filter((c) => c.status === "verified").length ?? 0);
const pendingCount = computed(() => props.claims?.filter((c) => c.status === "pending").length ?? 0);
</script>
