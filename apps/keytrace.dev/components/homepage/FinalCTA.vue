<template>
  <section class="max-w-[1120px] mx-auto px-6 pt-24 pb-16">
    <div class="relative p-16 rounded-2xl bg-kt-surface border border-zinc-800 overflow-hidden text-center">
      <!-- glow -->
      <div class="absolute inset-0" style="background: radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.13) 0%, transparent 70%)" />

      <div class="relative">
        <div class="font-mono text-[11px] text-zinc-500 tracking-[0.14em] uppercase">§4 — /signup</div>

        <h2 class="mt-3.5 text-[clamp(34px,4vw,52px)] font-semibold tracking-[-0.02em] text-zinc-100 leading-[1.08]">
          Keep the handle.<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">Prove the rest.</span>
        </h2>

        <p class="mt-4 text-[15px] text-zinc-400 max-w-[480px] mx-auto">Two minutes, one proof, one signed claim in your repo.</p>

        <div class="mt-7 flex gap-3 justify-center flex-wrap">
          <NuxtLink
            v-if="session?.authenticated"
            to="/add"
            class="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-medium rounded-lg transition-all hover:shadow-glow-brand no-underline"
          >
            Add a claim &rarr;
          </NuxtLink>
          <button
            v-else
            class="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-medium rounded-lg transition-all hover:shadow-glow-brand"
            @click="openLoginModal"
          >
            Sign in with Bluesky &rarr;
          </button>
          <NuxtLink
            to="/blog/introducing-keytrace"
            class="px-4 py-2.5 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-transparent hover:bg-white/[0.04] text-[13px] font-medium rounded-lg transition-all no-underline"
          >
            Read the launch post &rarr;
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { session } = useSession();
const { open: openLoginModal } = useLoginModal();
</script>
