<script setup lang="ts">
const props = defineProps<{ jwt: string }>();

const [encH, encP] = props.jwt.split(".");

function b64(s: string): string {
  return JSON.stringify(JSON.parse(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
}

const decH = b64(encH);
const decP = b64(encP);

const headerReveal = ref(0);
const payloadReveal = ref(0);
const running = ref(false);
const done = ref(false);
const status = ref("");

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function revealSegment(reveal: Ref<number>, target: string, delay: number) {
  for (let i = 1; i <= target.length; i++) {
    await sleep(delay);
    reveal.value = i;
  }
}

async function decode() {
  if (running.value) return;
  running.value = true;
  status.value = "Decoding header…";
  await revealSegment(headerReveal, decH, 20);
  status.value = "Decoding payload…";
  await revealSegment(payloadReveal, decP, 8);
  status.value = "";
  done.value = true;
}
</script>

<template>
  <div class="my-6 rounded-lg border border-[var(--kt-border-default,#27272a)] bg-[var(--kt-bg-surface,#13111c)] overflow-hidden">
    <!-- Static encoded JWT -->
    <div class="p-4 font-mono text-[.78rem] leading-[1.9] break-all border-b border-[var(--kt-border-default,#27272a)]">
      <span style="color: #fb015b">{{ encH }}</span
      ><span style="color: #52525b">.</span><span style="color: #c084fc">{{ encP }}</span
      ><span style="color: #52525b">.</span><span style="color: #60a5fa; opacity: 0.6">[signature]</span>
    </div>

    <!-- Decoded sections -->
    <div v-if="headerReveal > 0" class="px-4 pt-4 pb-3 font-mono text-[.78rem] leading-[1.9] break-all" style="margin-top: 0.75rem">
      <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 0.25rem">header</div>
      <span v-for="(ch, i) in decH.slice(0, headerReveal)" :key="i" class="reveal-h" style="color: #fb015b">{{ ch }}</span>
    </div>
    <div v-if="payloadReveal > 0" class="px-4 pt-3 pb-4 font-mono text-[.78rem] leading-[1.9] break-all">
      <div style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a; margin-bottom: 0.25rem">payload</div>
      <span v-for="(ch, i) in decP.slice(0, payloadReveal)" :key="i" class="reveal-p" style="color: #c084fc">{{ ch }}</span>
    </div>

    <!-- Controls -->
    <div class="border-t border-[var(--kt-border-default,#27272a)] px-4 py-3 flex items-center gap-3">
      <button
        :disabled="running"
        class="px-5 py-2 rounded-md border border-violet-500 bg-violet-500/10 text-violet-400 text-[.8rem] cursor-pointer disabled:opacity-50 disabled:cursor-default font-mono"
        @click="decode"
      >
        {{ done ? "Decoded ✓" : "Base64 Decode →" }}
      </button>
      <span class="text-xs text-[var(--kt-text-secondary,#a1a1aa)]">{{ status }}</span>
    </div>
  </div>
</template>

<style scoped>
@keyframes glow-h {
  from {
    text-shadow:
      0 0 10px #fb015b,
      0 0 22px #fb015b;
    filter: brightness(2.5);
    color: #ff8fb3;
  }
  to {
    text-shadow: none;
    filter: none;
    color: #fb015b;
  }
}
@keyframes glow-p {
  from {
    text-shadow:
      0 0 10px #c084fc,
      0 0 22px #c084fc;
    filter: brightness(2.5);
    color: #e0b4ff;
  }
  to {
    text-shadow: none;
    filter: none;
    color: #c084fc;
  }
}
.reveal-h {
  animation: glow-h 0.5s ease-out;
}
.reveal-p {
  animation: glow-p 0.5s ease-out;
}
</style>
