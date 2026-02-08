<template>
  <div class="flex items-center gap-2">
    <template v-for="(step, i) in steps" :key="i">
      <div
        class="flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all"
        :class="stepClass(i)"
      >
        <CheckIcon v-if="i < currentStep" class="w-4 h-4" />
        <span v-else>{{ i + 1 }}</span>
      </div>
      <div
        v-if="i < steps.length - 1"
        class="flex-1 h-px transition-colors"
        :class="i < currentStep ? 'bg-violet-500' : 'bg-zinc-800'"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { Check as CheckIcon } from "lucide-vue-next"

const props = defineProps<{
  steps: string[]
  currentStep: number
}>()

function stepClass(i: number) {
  if (i < props.currentStep) return "bg-violet-600 text-white"
  if (i === props.currentStep) return "bg-violet-600/20 text-violet-400 ring-1 ring-violet-500"
  return "bg-zinc-800 text-zinc-500"
}
</script>
