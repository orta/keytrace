<template>
  <section v-if="claims.length > 0" class="max-w-[1120px] mx-auto px-6 py-16">
    <div class="flex items-end justify-between gap-5 flex-wrap">
      <div>
        <SectionLabel num="§2" label="Recent proofs" />
        <h2 class="mt-2.5 text-[clamp(32px,3.6vw,44px)] font-semibold tracking-[-0.02em] text-zinc-100 leading-[1.1] max-w-[640px]">
          Fresh proofs from the network.
        </h2>
        <p class="mt-2.5 text-zinc-500 text-sm max-w-[520px]">
          Every claim here was written to its author's PDS. Stored in their repo, verifiable by anyone.
        </p>
      </div>
    </div>

    <!-- terminal frame -->
    <div class="mt-7 rounded-xl overflow-hidden bg-kt-inset border border-zinc-800">
      <!-- header -->
      <div class="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800 bg-kt-surface font-mono text-[11px] text-zinc-500">
        <span class="w-[7px] h-[7px] rounded-full bg-verified animate-kt-pulse" style="box-shadow: 0 0 0 3px rgba(34,197,94,0.13)" />
        <span>dev.keytrace.claim</span>
        <span class="flex-1" />
        <span class="text-zinc-600">{{ claims.length }} recent claims</span>
      </div>

      <!-- rows -->
      <div class="py-2 overflow-hidden" style="max-height: 400px">
        <div
          v-for="(row, idx) in claims"
          :key="row.handle + row.serviceType"
          class="grid gap-3.5 items-center px-4 py-2.5 font-mono text-[13px]"
          style="grid-template-columns: 72px 1fr auto"
          :style="{ opacity: 1 - idx * 0.03 }"
        >
          <span class="text-zinc-600 text-[11px]">{{ relativeTime(row.createdAt) }}</span>
          <div class="flex items-center gap-2.5 min-w-0">
            <component :is="getServiceIcon(row.serviceType ?? '')" class="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            <NuxtLink :to="`/@${row.handle}`" class="text-zinc-200 font-medium hover:text-white transition-colors no-underline truncate">{{ row.handle }}</NuxtLink>
            <span class="text-zinc-600">→</span>
            <span class="text-violet-400 truncate">{{ row.identity }}</span>
            <span v-if="row.serviceName" class="text-zinc-600 hidden sm:inline">via <span class="text-zinc-400">{{ row.serviceName }}</span></span>
          </div>
          <div class="flex items-center gap-1.5 text-verified text-[11px]">
            <CheckCircleIcon class="w-3 h-3 text-verified" />
            signed
          </div>
        </div>
      </div>

      <!-- footer -->
      <div class="border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between font-mono text-[11px] text-zinc-600">
        <span>··· from keytrace.dev</span>
        <NuxtLink to="/developers" class="text-violet-400 no-underline hover:text-violet-300 transition-colors">learn about the lexicon →</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CheckCircle as CheckCircleIcon } from "lucide-vue-next";

const { getServiceIcon, getServiceName } = useServiceRegistry();

const { data: claims } = await useFetch("/api/recent-claims", {
  transform: (raw: any[]) => {
    const seen = new Set<string>();
    return raw
      .filter((claim) => {
        if (seen.has(claim.handle)) return false;
        seen.add(claim.handle);
        return true;
      })
      .slice(0, 12)
      .map((claim) => ({
        handle: claim.handle,
        serviceType: claim.type ?? "",
        serviceName: claim.type ? getServiceName(claim.type) : "",
        identity: claim.identity?.displayName ?? claim.identity?.subject ?? claim.handle,
        createdAt: claim.createdAt ?? "",
      }));
  },
  default: () => [],
});

function relativeTime(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
</script>
