<template>
  <div
    class="relative rounded-xl overflow-hidden bg-kt-inset border border-zinc-800"
    style="
      box-shadow:
        0 24px 60px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(139, 92, 246, 0.13),
        0 0 80px rgba(139, 92, 246, 0.08);
    "
  >
    <!-- browser chrome bar -->
    <div class="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-zinc-800 bg-kt-surface">
      <div class="flex gap-1.5">
        <span v-for="c in ['#ef444480', '#f59e0b80', '#22c55e80']" :key="c" class="w-2.5 h-2.5 rounded-full" :style="{ background: c }" />
      </div>
      <div class="flex-1 ml-2 px-2.5 py-1 rounded-md bg-kt-inset border border-zinc-800 font-mono text-[11px] text-zinc-500 flex items-center gap-1.5">
        <LockIcon class="w-2.5 h-2.5 text-verified" />
        keytrace.dev/add/github
      </div>
      <span class="font-mono text-[10px] text-zinc-600">live</span>
    </div>

    <!-- body -->
    <div class="px-4 pt-4 pb-5" style="min-height: 320px">
      <!-- target line -->
      <div class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-kt-surface border border-zinc-800 mb-3.5">
        <GithubIcon class="w-4 h-4 text-zinc-300 shrink-0" />
        <span class="font-mono text-xs text-zinc-400"> linking <span class="text-zinc-100">orta.io</span> → <span class="text-violet-400">@orta</span> on GitHub </span>
      </div>

      <!-- steps list -->
      <div class="font-mono text-[12.5px] leading-7 flex flex-col gap-0.5">
        <div
          v-for="(line, i) in steps"
          :key="i"
          class="flex gap-2.5 transition-all duration-[250ms]"
          :style="{
            opacity: step > i ? 1 : 0,
            transform: step > i ? 'translateY(0)' : 'translateY(4px)',
            color: lineColor(line.s),
          }"
        >
          <span class="w-3.5 text-center" :style="{ color: lineColor(line.s) }">
            <template v-if="step === i && line.s !== 'ok'">
              <span class="text-violet-500">{{ spinnerChar }}</span>
            </template>
            <template v-else>{{ linePrefix(line.s) }}</template>
          </span>
          <span :style="{ color: line.s === 'ok' ? '#22c55e' : '#d4d4d8' }">{{ line.text }}</span>
        </div>
      </div>

      <!-- success card -->
      <div
        v-if="step >= steps.length"
        class="mt-3.5 px-3 py-2.5 rounded-lg flex gap-2.5 items-start font-mono text-xs"
        style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25)"
      >
        <CheckCircleIcon class="w-3.5 h-3.5 text-verified shrink-0 mt-0.5" />
        <div>
          <div class="text-verified font-medium">claim created</div>
          <div class="text-zinc-500 mt-0.5">at://did:plc:x2ns…/dev.keytrace.claim/3kxbz9q</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Lock as LockIcon, Github as GithubIcon, CheckCircle as CheckCircleIcon } from "lucide-vue-next";

const steps = [
  { s: "resolving", text: "resolving DID for orta.io" },
  { s: "ok", text: "did:plc:t732otzqvkch7zz5d37537ry" },
  { s: "fetching", text: "fetching gist gist.github.com/orta/b7dccdfb..." },
  { s: "verifying", text: "matching proof token against handle" },
  { s: "ok", text: "proof valid · signature matches DID" },
  { s: "writing", text: "writing dev.keytrace.claim to your PDS" },
];

const CYCLE = 18;
const step = ref(0);
const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const spinnerIdx = ref(0);
const spinnerChar = computed(() => spinnerChars[spinnerIdx.value]);

let tickInterval: ReturnType<typeof setInterval>;
let spinInterval: ReturnType<typeof setInterval>;

onMounted(() => {
  tickInterval = setInterval(() => {
    step.value = (step.value + 1) % CYCLE;
  }, 350);
  spinInterval = setInterval(() => {
    spinnerIdx.value = (spinnerIdx.value + 1) % spinnerChars.length;
  }, 80);
});

onUnmounted(() => {
  clearInterval(tickInterval);
  clearInterval(spinInterval);
});

function lineColor(s: string) {
  const colors: Record<string, string> = {
    resolving: "#71717a",
    fetching: "#71717a",
    verifying: "#f59e0b",
    writing: "#a1a1aa",
    ok: "#22c55e",
  };
  return colors[s] || "#a1a1aa";
}

function linePrefix(s: string) {
  return s === "ok" ? "✓" : "··";
}
</script>
