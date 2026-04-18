<template>
  <div>
    <HeroSection />
    <HowItWorksSection />
    <LiveSignupsFeed />
    <DevelopersSection />
    <FinalCTA />
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Keytrace — One identity, many proofs.",
  ogTitle: "Keytrace — One identity, many proofs.",
  description: "Link your GitHub, domain, and other accounts to your internet handle. Cryptographically signed, user-owned, and portable.",
  ogDescription: "Link your GitHub, domain, and other accounts to your internet handle. Cryptographically signed, user-owned, and portable.",
  twitterCard: "summary_large_image",
  ogImage: "/__og-image__/image/og.png",
  ogUrl: "https://keytrace.dev",
  twitterTitle: "Keytrace — One identity, many proofs.",
  twitterDescription: "Link your GitHub, domain, and other accounts to your internet handle. Cryptographically signed, user-owned, and portable.",
  twitterImage: "/__og-image__/image/og.png",
});

useHead({
  htmlAttrs: { lang: "en" },
  link: [{ rel: "icon", type: "image/png", href: "/favicon.png" }],
});

// Fetch recent claims for OG image
const { data: recentClaims } = await useFetch("/api/recent-claims", {
  transform: (claims: any[]) => {
    const seen = new Set<string>();
    return claims
      .filter((claim) => {
        if (seen.has(claim.handle)) return false;
        seen.add(claim.handle);
        return true;
      })
      .slice(0, 5)
      .map((claim) => ({
        handle: claim.handle,
        type: claim.type,
        avatar: claim.avatar ? (claim.avatar.includes("cdn.bsky.app") ? `${claim.avatar}@jpeg` : claim.avatar) : undefined,
        identity: claim.identity?.displayName ?? claim.identity?.subject,
      }));
  },
  default: () => [],
});

defineOgImage("Home", {
  claims: recentClaims,
});
</script>
