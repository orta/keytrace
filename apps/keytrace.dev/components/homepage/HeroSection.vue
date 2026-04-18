<template>
  <section class="relative overflow-hidden border-b border-zinc-800">
    <!-- gradient backdrop -->
    <div class="absolute inset-0 kt-gradient-hero" />
    <!-- grid pattern -->
    <div
      class="absolute inset-0 opacity-[0.04]"
      :style="{
        backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(gridSvg)}')`,
        backgroundSize: '36px 36px',
      }"
    />

    <div class="relative max-w-[1120px] mx-auto px-6 py-24 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
      <!-- Left column -->
      <div>
        <!-- above-headline cue -->
        <div class="inline-flex items-center gap-2 font-mono text-[11px] text-zinc-500 px-2.5 py-1.5 rounded-full border border-zinc-800 bg-kt-surface/50 mb-6">
          <span class="w-1.5 h-1.5 rounded-full bg-verified" style="box-shadow: 0 0 8px #22c55e" />
          atproto.identity.v1 · cryptographically signed
        </div>

        <h1 class="text-[clamp(48px,6vw,76px)] font-bold tracking-[-0.025em] leading-[1.02] text-zinc-100 m-0">
          One identity,<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">many proofs.</span>
        </h1>

        <p class="mt-6 text-[17px] leading-relaxed text-zinc-400 max-w-[480px]">
          Keytrace links your atproto handle to the accounts you already own — GitHub, DNS, npm, Mastodon, PGP — with signed, portable proofs.
          <span class="text-zinc-200">You be you, everywhere.</span>
        </p>

        <div class="mt-8 flex gap-3 items-center flex-wrap">
          <NuxtLink
            v-if="session?.authenticated"
            :to="`/@${session.handle}`"
            class="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-medium rounded-lg transition-all hover:shadow-glow-brand"
          >
            Go To Your Profile &rarr;
          </NuxtLink>
          <button
            v-else
            class="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-medium rounded-lg transition-all hover:shadow-glow-brand"
            @click="openLoginModal"
          >
            Sign in with Bluesky &rarr;
          </button>
          <NuxtLink
            to="/@orta.io"
            class="px-4 py-2.5 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-transparent hover:bg-white/[0.04] text-[13px] font-medium rounded-lg transition-all"
          >
            View example profile &rarr;
          </NuxtLink>
        </div>

        <!-- proof service icons row -->
        <div class="mt-9 flex gap-4 items-center text-zinc-600 font-mono text-[11px] flex-wrap">
          <span>supports:</span>
          <GithubIcon class="w-4 h-4 text-zinc-500" />
          <GlobeIcon class="w-4 h-4 text-zinc-500" />
          <PackageIcon class="w-4 h-4 text-zinc-500" />
          <AtSignIcon class="w-4 h-4 text-zinc-500" />
          <KeyIcon class="w-4 h-4 text-zinc-500" />
          <FileCodeIcon class="w-4 h-4 text-zinc-500" />
          <LinkedinIcon class="w-4 h-4 text-zinc-500" />
        </div>
      </div>

      <!-- Terminal preview -->
      <HeroTerminal />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Github as GithubIcon, Globe as GlobeIcon, Package as PackageIcon, AtSign as AtSignIcon, Key as KeyIcon, FileCode as FileCodeIcon, Linkedin as LinkedinIcon } from "lucide-vue-next";

const { session } = useSession();
const { open: openLoginModal } = useLoginModal();

const gridSvg = `<svg width='36' height='36' xmlns='http://www.w3.org/2000/svg'><path d='M36 0H0v36' fill='none' stroke='white' stroke-width='0.5'/></svg>`;
</script>
