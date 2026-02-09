<template>
  <div class="flex items-center gap-3 px-4 py-3 rounded-lg bg-kt-surface border border-zinc-800/50 hover:border-zinc-700/50 transition-colors group">
    <!-- Avatar -->
    <img v-if="claim.avatar" :src="claim.avatar" :alt="claim.handle" class="w-8 h-8 rounded-full bg-zinc-800" />
    <div v-else class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
      <UserIcon class="w-4 h-4 text-zinc-600" />
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <NuxtLink :to="`/@${claim.handle}`" class="text-sm text-zinc-200 hover:text-white font-medium transition-colors">
        {{ claim.handle }}
      </NuxtLink>
      <span class="text-zinc-600 text-sm mx-1.5">verified</span>
      <span class="text-sm text-zinc-400">
        {{ claim.displayName }}
      </span>
    </div>

    <!-- Service icon + timestamp -->
    <div class="flex items-center gap-3 text-xs text-zinc-500">
      <component :is="serviceIcon" class="w-4 h-4" />
      <span v-if="claim.createdAt">{{ relativeTime(claim.createdAt) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Github, Globe, AtSign, Key, User as UserIcon } from "lucide-vue-next";

export interface RecentClaim {
  handle: string;
  avatar?: string;
  displayName: string;
  serviceType?: string;
  createdAt?: string;
}

const props = defineProps<{
  claim: RecentClaim;
}>();

const serviceIcons: Record<string, any> = {
  github: Github,
  domain: Globe,
  dns: Globe,
  mastodon: AtSign,
  fediverse: AtSign,
};

const serviceIcon = computed(() => serviceIcons[props.claim.serviceType ?? ""] ?? Key);

function relativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
</script>
