<template>
  <div>
    <!-- Hero Section -->
    <section class="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <!-- Gradient background -->
      <div class="absolute inset-0 kt-gradient-hero" />

      <!-- Subtle grid pattern -->
      <div
        class="absolute inset-0 opacity-[0.03]"
        :style="{
          backgroundImage: `url('data:image/svg+xml,${encodeURIComponent(gridSvg)}')`,
          backgroundSize: '32px 32px',
        }"
      />

      <div class="relative z-10 max-w-3xl mx-auto text-center px-6">
        <!-- Tagline pill -->
        <div class="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400">
          <span class="w-2 h-2 rounded-full bg-verified animate-pulse" />
          Identity verification for internet handles
        </div>

        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.1]">
          You be you,<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400"> everywhere. </span>
        </h1>

        <p class="mt-6 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          Link your GitHub, domain, and other accounts to your internet handle. Cryptographically signed, user-owned, and portable.
        </p>

        <!-- CTA group -->
        <div class="mt-10 flex items-center justify-center gap-4">
          <NuxtLink
            v-if="session?.authenticated"
            :to="`/@${session.handle}`"
            class="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand"
          >
            Go To Your Profile &rarr;
          </NuxtLink>
          <button
            v-else
            class="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand"
            @click="openLoginModal"
          >
            Get Started
          </button>
          <NuxtLink to="/@orta.io" class="px-6 py-2.5 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"> View example profile &rarr; </NuxtLink>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="max-w-4xl mx-auto px-6 py-16">
      <h2 class="text-lg font-semibold text-zinc-300 mb-8 text-center">How it works</h2>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div v-for="step in howItWorks" :key="step.number" class="text-center">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center text-sm font-mono font-bold" :class="'bg-violet-600/10 text-violet-400'">
            {{ step.number }}
          </div>
          <h3 class="text-sm font-semibold text-zinc-200 mb-1">
            {{ step.title }}
          </h3>
          <p class="text-xs text-zinc-500 leading-relaxed">
            {{ step.description }}
          </p>
        </div>
      </div>
    </section>

    <!-- Recent verifications feed -->
    <section v-if="recentClaims && recentClaims.length > 0" class="max-w-4xl mx-auto px-6 py-16">
      <h2 class="text-lg font-semibold text-zinc-300 mb-6">Recent proofs</h2>

      <div class="space-y-2">
        <RecentClaimRow v-for="claim in recentClaims" :key="claim.handle + claim.displayName" :claim="claim" />
      </div>

      <div class="mt-8 text-center">
        <NuxtLink
          v-if="session?.authenticated"
          to="/add"
          class="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand"
        >
          Claim an account &rarr;
        </NuxtLink>
        <button
          v-else
          class="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand"
          @click="openLoginModal"
        >
          OK, I get it! Sign in
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { session } = useSession();
const { open: openLoginModal } = useLoginModal();

useSeoMeta({
  title: "Keytrace - Identity Verification for internet handles",
  ogTitle: "Keytrace - You be you, everywhere.",
  description: "Link your GitHub, domain, and other accounts to your internet handle. Cryptographically signed, user-owned, and portable.",
  ogDescription: "Link your GitHub, domain, and other accounts to your internet handle. Cryptographically signed, user-owned, and portable.",
  twitterCard: "summary_large_image",
  ogImage: "/__og-image__/image/og.png",
  ogUrl: "https://keytrace.dev",
  twitterTitle: "Keytrace - You be you, everywhere.",
  twitterDescription: "Link your GitHub, domain, and other accounts to your internet handle. Cryptographically signed, user-owned, and portable.",
  twitterImage: "/__og-image__/image/og.png",
});

useHead({
  htmlAttrs: { lang: "en" },
  link: [{ rel: "icon", type: "image/png", href: "/favicon.png" }],
});

const gridSvg = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path d="M32 0H0v32" fill="none" stroke="white" stroke-width="0.5"/></svg>`;

const howItWorks = [
  {
    number: 1,
    title: "Sign in with your internet handle",
    description: "No need for another account, and you will not have to generate PGP keys.",
  },
  {
    number: 2,
    title: "Add your proof elsewhere",
    description: "Post a small verification token to your GitHub, domain DNS, or other account.",
  },
  {
    number: 3,
    title: "Make a claim",
    description: "Keytrace verifies the proof and creates a claim in your account for other apps to use.",
  },
];

// Fetch recent verifications from the API (show 20 on home page)
const { data: recentClaims } = await useFetch("/api/recent-claims", {
  transform: (claims: any[]) => {
    const seen = new Set<string>();
    return claims
      .filter((claim) => {
        if (seen.has(claim.handle)) return false;
        seen.add(claim.handle);
        return true;
      })
      .map((claim) => ({
        handle: claim.handle,
        avatar: claim.avatar,
        displayName: claim.displayName,
        serviceType: claim.type,
        createdAt: claim.createdAt,
        identity: claim.identity,
      }));
  },
  default: () => [],
});

defineOgImage("Home", {
  claims: computed(() =>
    (recentClaims.value ?? []).slice(0, 5).map((c: any) => ({
      handle: c.handle,
      type: c.serviceType,
      avatar: c.avatar ? (c.avatar.includes("cdn.bsky.app") ? `${c.avatar}@jpeg` : c.avatar) : undefined,
      identity: c.identity?.displayName ?? c.identity?.subject,
    })),
  ),
});
</script>
