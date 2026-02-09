<template>
  <div class="rounded-xl border border-zinc-800 bg-kt-surface overflow-hidden">
    <div v-for="(step, i) in steps" :key="i" class="flex items-start gap-3 px-4 py-3 border-b border-zinc-800/50 last:border-b-0">
      <!-- Status indicator -->
      <div class="mt-0.5">
        <CheckCircleIcon v-if="step.status === 'success'" class="w-4 h-4 text-verified" />
        <XCircleIcon v-else-if="step.status === 'error'" class="w-4 h-4 text-failed" />
        <div v-else-if="step.status === 'running'" class="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <div v-else class="w-4 h-4 rounded-full border border-zinc-700" />
      </div>

      <!-- Step info -->
      <div class="flex-1 min-w-0">
        <span
          class="text-sm font-mono"
          :class="{
            'text-zinc-300': step.status === 'success',
            'text-violet-400': step.status === 'running',
            'text-failed': step.status === 'error',
            'text-zinc-600': step.status === 'pending',
          }"
        >
          {{ step.action }}
        </span>
        <div v-if="step.detail" class="text-xs text-zinc-500 mt-0.5 font-mono truncate">
          {{ step.detail }}
        </div>
      </div>

      <!-- Timing -->
      <span v-if="step.duration" class="text-xs text-zinc-600 font-mono"> {{ step.duration }}ms </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle as CheckCircleIcon, XCircle as XCircleIcon } from "lucide-vue-next";

export interface VerificationStep {
  action: string;
  detail?: string;
  status: "pending" | "running" | "success" | "error";
  duration?: number;
}

defineProps<{
  steps: VerificationStep[];
}>();
</script>
