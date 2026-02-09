<template>
  <div class="rounded-xl border border-zinc-800 bg-kt-surface overflow-hidden">
    <div v-for="(step, i) in steps" :key="i" class="border-b border-zinc-800/50 last:border-b-0">
      <div class="flex items-start gap-3 px-4 py-3">
        <!-- Status indicator -->
        <div class="mt-0.5">
          <CheckCircleIcon v-if="step.status === 'success'" class="w-4 h-4 text-verified" />
          <XCircleIcon v-else-if="step.status === 'error'" class="w-4 h-4 text-failed" />
          <div v-else-if="step.status === 'running'" class="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <div v-else class="w-4 h-4 rounded-full border border-zinc-700" />
        </div>

        <!-- Step info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
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
            <!-- Disclosure toggle -->
            <button
              v-if="step.expandable"
              class="text-zinc-500 hover:text-zinc-300 transition-colors"
              @click="toggleExpand(i)"
            >
              <ChevronRightIcon
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-90': expandedSteps.has(i) }"
              />
            </button>
          </div>
          <div v-if="step.detail" class="text-xs text-zinc-500 mt-0.5 font-mono truncate">
            {{ step.detail }}
          </div>
        </div>

        <!-- Timing -->
        <span v-if="step.duration" class="text-xs text-zinc-600 font-mono"> {{ step.duration }}ms </span>
      </div>

      <!-- Expandable content -->
      <div
        v-if="step.expandable && expandedSteps.has(i)"
        class="px-4 pb-3 ml-7"
      >
        <div class="rounded-lg bg-kt-inset border border-zinc-800 overflow-hidden">
          <!-- URL/Target if present -->
          <div v-if="step.expandable.url" class="px-3 py-2 border-b border-zinc-800 text-xs">
            <span class="text-zinc-500">{{ getFetchLabel(step.expandable.fetcher) }}: </span>
            <span class="text-zinc-400 font-mono break-all">{{ step.expandable.url }}</span>
          </div>
          <!-- Content preview -->
          <div v-if="step.expandable.content" class="p-3">
            <pre class="text-xs text-zinc-400 font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{{ step.expandable.content }}</pre>
          </div>
          <!-- Match targets -->
          <div v-if="step.expandable.targets && step.expandable.targets.length > 0" class="border-t border-zinc-800 p-3 space-y-2">
            <div class="text-xs text-zinc-500 font-medium mb-2">Match targets:</div>
            <div v-for="(target, ti) in step.expandable.targets" :key="ti" class="text-xs font-mono">
              <div class="flex items-center gap-2">
                <CheckCircleIcon v-if="target.matched" class="w-3 h-3 text-verified flex-shrink-0" />
                <XCircleIcon v-else class="w-3 h-3 text-zinc-600 flex-shrink-0" />
                <span class="text-zinc-400">{{ target.path.join('.') }}</span>
                <span class="text-zinc-600">({{ target.relation }})</span>
              </div>
              <div v-if="target.valuesFound.length > 0" class="ml-5 mt-1 text-zinc-500 break-all">
                Found: {{ target.valuesFound.map(v => v.slice(0, 100) + (v.length > 100 ? '...' : '')).join(', ') }}
              </div>
              <div v-else class="ml-5 mt-1 text-zinc-600 italic">
                No values found at this path
              </div>
            </div>
          </div>
          <!-- Patterns used -->
          <div v-if="step.expandable.patterns && step.expandable.patterns.length > 0" class="border-t border-zinc-800 p-3">
            <div class="text-xs text-zinc-500 font-medium mb-1">Looking for:</div>
            <div class="text-xs font-mono text-emerald-400/80">
              {{ step.expandable.patterns.join(' or ') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export interface ExpandableContent {
  url?: string;
  fetcher?: string;
  content?: string;
  targets?: Array<{
    path: string[];
    relation: string;
    valuesFound: string[];
    matched: boolean;
  }>;
  patterns?: string[];
}

export interface VerificationStep {
  action: string;
  detail?: string;
  status: "pending" | "running" | "success" | "error";
  duration?: number;
  expandable?: ExpandableContent;
}
</script>

<script setup lang="ts">
import { ref } from "vue";
import { CheckCircle as CheckCircleIcon, XCircle as XCircleIcon, ChevronRight as ChevronRightIcon } from "lucide-vue-next";

defineProps<{
  steps: VerificationStep[];
}>();

const expandedSteps = ref<Set<number>>(new Set());

function toggleExpand(index: number) {
  if (expandedSteps.value.has(index)) {
    expandedSteps.value.delete(index);
  } else {
    expandedSteps.value.add(index);
  }
  // Trigger reactivity
  expandedSteps.value = new Set(expandedSteps.value);
}

function getFetchLabel(fetcher?: string): string {
  switch (fetcher) {
    case "dns":
      return "DNS TXT lookup";
    case "activitypub":
      return "ActivityPub fetch";
    case "http":
    default:
      return "URL";
  }
}
</script>
