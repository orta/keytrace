<template>
  <section class="max-w-[1120px] mx-auto px-6 pt-[88px] pb-12">
    <SectionLabel num="§1" label="How it works" />

    <h2 class="mt-2.5 text-[clamp(32px,3.6vw,44px)] font-semibold tracking-[-0.02em] text-zinc-100 max-w-[640px] leading-[1.1]">
      A proof is a link you <span class="text-zinc-500">control</span>, connecting your <span class="text-zinc-500">atproto identity.</span>
    </h2>

    <div class="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div v-for="s in steps" :key="s.n" class="relative p-5 bg-kt-surface border border-zinc-800 rounded-[10px]">
        <div class="font-mono text-[11px] text-violet-400 tracking-[0.1em] mb-2.5">{{ s.n }}</div>
        <h3 class="m-0 text-base font-semibold text-zinc-100 leading-snug">{{ s.t }}</h3>
        <p class="mt-2 text-[13px] text-zinc-400 leading-relaxed">{{ s.d }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const steps = [
  {
    n: "01",
    t: "Sign in with your internet handle",
    d: "OAuth with your atproto PDS. No new account. No PGP keys to generate.",
  },
  {
    n: "02",
    t: "Post a proof where you already are",
    d: "Drop a short token into a gist, a DNS TXT record, a package README, a pinned post.",
  },
  {
    n: "03",
    t: "Keytrace signs the claim",
    d: "Our runner verifies the proof and writes a dev.keytrace.claim record to your repo.",
  },
];
</script>
