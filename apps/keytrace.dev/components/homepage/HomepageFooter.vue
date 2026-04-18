<template>
  <footer class="border-t border-zinc-800 bg-kt-inset pt-14 pb-8">
    <div class="max-w-[1120px] mx-auto px-6">
      <div class="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_1fr] gap-8 items-start">
        <!-- Brand column -->
        <div>
          <KeytraceLogo :height="26" />
          <p class="mt-3.5 text-[13px] text-zinc-500 max-w-[280px] leading-relaxed">
            Cryptographic proofs of identity for atproto. Open lexicon, open source runner, your repo.
          </p>
          <div class="mt-4 flex gap-2.5">
            <a
              v-for="link in socialLinks"
              :key="link.icon"
              :href="link.href"
              target="_blank"
              rel="noopener"
              class="w-8 h-8 rounded-lg bg-kt-surface border border-zinc-800 inline-flex items-center justify-center hover:border-zinc-700 transition-colors"
            >
              <component :is="link.iconComp" class="w-3.5 h-3.5 text-zinc-400" />
            </a>
          </div>
        </div>

        <!-- Link columns -->
        <div v-for="col in columns" :key="col.h">
          <div class="font-mono text-[11px] text-zinc-500 tracking-[0.14em] uppercase mb-3.5">{{ col.h }}</div>
          <ul class="list-none p-0 m-0 flex flex-col gap-2">
            <li v-for="link in col.links" :key="link.label">
              <NuxtLink v-if="link.to" :to="link.to" class="text-[13px] text-zinc-400 no-underline hover:text-zinc-200 transition-colors">
                {{ link.label }}
              </NuxtLink>
              <a v-else :href="link.href" target="_blank" rel="noopener" class="text-[13px] text-zinc-400 no-underline hover:text-zinc-200 transition-colors">
                {{ link.label }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="mt-10 pt-5 border-t border-zinc-800 flex flex-wrap gap-4 items-center justify-between font-mono text-[11px] text-zinc-600">
        <div class="flex gap-3.5 flex-wrap">
          <span>© 2026 keytrace.dev</span>
          <span class="text-zinc-700">·</span>
          <span>Built on atproto</span>
        </div>
        <a href="https://bsky.app/profile/orta.io" target="_blank" rel="noopener" class="text-violet-400 no-underline hover:text-violet-300 transition-colors font-mono text-[11px]">./orta</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { Github as GithubIcon, Rss as RssIcon, AtSign as AtSignIcon } from "lucide-vue-next";

const socialLinks = [
  { icon: "github", iconComp: GithubIcon, href: "https://github.com/orta/keytrace" },
  { icon: "rss", iconComp: RssIcon, href: "/blog" },
  { icon: "at-sign", iconComp: AtSignIcon, href: "https://bsky.app/profile/orta.io" },
];

const columns = [
  {
    h: "Product",
    links: [
      { label: "Sign in", to: "/" },
      { label: "Add a claim", to: "/add" },
      { label: "Services", to: "/services" },
      { label: "Example profile", to: "/@orta.io" },
    ],
  },
  {
    h: "Developers",
    links: [
      { label: "Lexicon", to: "/developers" },
      { label: "@keytrace/claims", href: "https://www.npmjs.com/package/@keytrace/claims" },
      { label: "@keytrace/runner", href: "https://www.npmjs.com/package/@keytrace/runner" },
    ],
  },
  {
    h: "Project",
    links: [
      { label: "Blog", to: "/blog" },
      { label: "Source (GitHub)", href: "https://github.com/orta/keytrace" },
    ],
  },
];
</script>
