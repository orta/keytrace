<template>
  <div
    class="flex items-start gap-3 px-3 py-1.5 rounded-md transition-colors"
    :class="message.saved ? 'bg-emerald-500/5 border border-emerald-500/20' : 'hover:bg-zinc-800/30'"
  >
    <!-- Timestamp -->
    <span class="text-[11px] text-zinc-600 font-mono shrink-0 pt-0.5">
      {{ formatTime(message.timestamp) }}
    </span>

    <!-- Platform badge -->
    <span
      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
      :class="platformBadgeClass"
    >
      <component :is="platformIcon" class="w-3 h-3" />
      {{ message.platform }}
    </span>

    <!-- Username -->
    <span class="text-sm font-medium text-zinc-300 shrink-0">
      {{ message.username }}
    </span>

    <!-- Message text -->
    <span class="text-sm text-zinc-400 break-all min-w-0 flex-1">
      {{ message.text }}
    </span>

    <!-- Saved indicator -->
    <span
      v-if="message.saved"
      class="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0"
    >
      <CheckCircleIcon class="w-3 h-3" />
      saved
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  CheckCircle as CheckCircleIcon,
  MessageSquare,
  Hash,
  AtSign,
  Globe,
  Smartphone,
} from "lucide-vue-next";

interface ChatMessage {
  id: string;
  text: string;
  username: string;
  platform: string;
  timestamp: number;
  did?: string;
  saved?: boolean;
}

const props = defineProps<{
  message: ChatMessage;
}>();

const platformIcons: Record<string, any> = {
  telegram: Smartphone,
  signal: Smartphone,
  whatsapp: Smartphone,
  discord: Hash,
  matrix: Globe,
  slack: Hash,
  mastodon: AtSign,
  irc: Hash,
};

const platformIcon = computed(() => platformIcons[props.message.platform] ?? MessageSquare);

const platformColors: Record<string, string> = {
  telegram: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  signal: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  whatsapp: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  discord: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20",
  matrix: "bg-teal-500/15 text-teal-400 border border-teal-500/20",
  slack: "bg-purple-500/15 text-purple-400 border border-purple-500/20",
  mastodon: "bg-violet-500/15 text-violet-400 border border-violet-500/20",
  irc: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
};

const platformBadgeClass = computed(
  () => platformColors[props.message.platform] ?? "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
);

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
</script>
