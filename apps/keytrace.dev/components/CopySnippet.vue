<script setup lang="ts">
import { Check as CheckIcon, Copy as CopyIcon } from "lucide-vue-next";

const props = defineProps<{ value: string; preview?: number }>();

const previewLen = props.preview ?? 20;
const reveal = ref(previewLen);
const expanding = ref(false);
const copied = ref(false);

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

async function expand() {
  if (expanding.value || reveal.value >= props.value.length) return;
  expanding.value = true;
  for (let i = reveal.value + 1; i <= props.value.length; i++) {
    await sleep(8);
    reveal.value = i;
  }
  expanding.value = false;
}

async function copy() {
  try {
    await navigator.clipboard.writeText(props.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {}
}
</script>

<template>
  <div class="my-2 flex items-center gap-3 rounded-md border border-[var(--kt-border-default,#27272a)] bg-[var(--kt-bg-elevated,#1c1929)] px-4 py-2.5">
    <span
      class="font-mono text-sm text-zinc-300 flex-1 break-all"
      :class="reveal < value.length ? 'cursor-pointer' : ''"
      @click="expand"
    >
      <span v-for="(ch, i) in value.slice(0, reveal)" :key="i" class="reveal-char">{{ ch }}</span>
      <span v-if="reveal < value.length" style="color:#52525b">…</span>
    </span>
    <button
      class="flex items-center justify-center gap-1.5 rounded border px-3 py-1 text-xs font-mono transition-colors shrink-0 w-20"
      :class="copied
        ? 'border-green-600/50 bg-green-500/10 text-green-400'
        : 'border-[var(--kt-border-emphasis,#3f3f46)] bg-[var(--kt-bg-surface,#13111c)] text-zinc-300 hover:text-white hover:border-zinc-400'"
      @click="copy"
    >
      <CheckIcon v-if="copied" class="w-3.5 h-3.5" />
      <CopyIcon v-else class="w-3.5 h-3.5" />
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
  </div>
</template>

<style scoped>
@keyframes reveal {
  from { text-shadow: 0 0 8px #e4e4e7, 0 0 18px #a1a1aa; filter: brightness(2); color: #fff; }
  to   { text-shadow: none; filter: none; color: #d4d4d8; }
}
.reveal-char {
  display: inline;
  animation: reveal 0.4s ease-out;
}
</style>
