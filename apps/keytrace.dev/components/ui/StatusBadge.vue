<template>
  <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" :class="config.classes">
    <component :is="config.icon" class="w-3 h-3" />
    {{ config.label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { CheckCircle, Clock, XCircle, MinusCircle, HelpCircle, Ban } from "lucide-vue-next";

const props = defineProps<{
  status: string;
}>();

const configs: Record<string, { classes: string; icon: typeof CheckCircle; label: string }> = {
  verified: {
    classes: "bg-verified/15 text-verified border border-verified/20",
    icon: CheckCircle,
    label: "Verified",
  },
  pending: {
    classes: "bg-pending/15 text-pending border border-pending/20",
    icon: Clock,
    label: "Pending",
  },
  init: {
    classes: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
    icon: Clock,
    label: "Not checked",
  },
  matched: {
    classes: "bg-pending/15 text-pending border border-pending/20",
    icon: Clock,
    label: "Pending",
  },
  failed: {
    classes: "bg-failed/15 text-failed border border-failed/20",
    icon: XCircle,
    label: "Failed",
  },
  error: {
    classes: "bg-failed/15 text-failed border border-failed/20",
    icon: XCircle,
    label: "Error",
  },
  retracted: {
    classes: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
    icon: Ban,
    label: "Retracted",
  },
  unverified: {
    classes: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
    icon: MinusCircle,
    label: "Unverified",
  },
};

const defaultConfig = {
  classes: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/20",
  icon: HelpCircle,
  label: "Unknown",
};

const config = computed(() => configs[props.status] || defaultConfig);
</script>
