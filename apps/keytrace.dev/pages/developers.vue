<template>
  <div class="max-w-3xl mx-auto px-4 py-12">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-600/15 border border-violet-500/20">
          <span class="font-mono text-xs font-bold text-violet-400">@keytrace/claims</span>
        </div>
        <a href="https://www.npmjs.com/package/@keytrace/claims" target="_blank" rel="noopener" class="text-xs text-zinc-500 hover:text-zinc-400"> npm </a>
      </div>
      <h1 class="text-2xl font-bold text-zinc-100 mb-2">Verify Keytrace Claims</h1>
      <p class="text-zinc-400">Verify identity claims in the browser or Node.js. Zero runtime dependencies.</p>
    </div>

    <!-- Install command -->
    <div class="mb-8 bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
      <code class="font-mono text-sm text-zinc-300">npm install @keytrace/claims</code>
      <button class="text-zinc-500 hover:text-zinc-300 transition-colors" @click="copyInstall" :title="copied ? 'Copied!' : 'Copy'">
        <CheckIcon v-if="copied" class="w-4 h-4 text-verified" />
        <CopyIcon v-else class="w-4 h-4" />
      </button>
    </div>

    <!-- Handle Input -->
    <div class="mb-8">
      <div class="flex gap-2 mb-3">
        <input
          v-model="handleInput"
          type="text"
          placeholder="alice.bsky.social or did:plc:..."
          class="flex-1 bg-kt-inset border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
          @keydown.enter="runVerify"
          :disabled="status === 'verifying'"
        />
        <button
          class="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          @click="runVerify"
          :disabled="status === 'verifying' || !handleInput.trim()"
        >
          <LoaderIcon v-if="status === 'verifying'" class="w-4 h-4 animate-spin" />
          <span v-else>Verify</span>
        </button>
      </div>

      <!-- Recent handles -->
      <div v-if="recentHandles.length > 0" class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-zinc-600">Recent:</span>
        <button
          v-for="h in recentHandles"
          :key="h"
          class="px-2 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-full transition-colors"
          @click="selectHandle(h)"
          :disabled="status === 'verifying'"
        >
          {{ h }}
        </button>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="status === 'error' && error" class="mb-8 bg-failed/10 border border-failed/30 rounded-lg p-4">
      <div class="flex items-center gap-2 text-failed">
        <AlertCircleIcon class="w-4 h-4" />
        <span class="text-sm font-medium">Verification failed</span>
      </div>
      <p class="text-sm text-zinc-400 mt-1">{{ error }}</p>
    </div>

    <!-- Loading state -->
    <div v-if="status === 'verifying'" class="mb-8">
      <div class="bg-kt-card border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center">
        <LoaderIcon class="w-8 h-8 text-violet-400 animate-spin mb-4" />
        <p class="text-sm text-zinc-400 mb-4">
          Verifying claims for <span class="font-mono text-violet-400">{{ handle }}</span>...
        </p>
        <p class="text-xs text-zinc-500 mb-2 w-full text-left">Running this code:</p>
        <div class="w-full bg-zinc-900 border border-zinc-800 rounded p-3 overflow-x-auto">
          <pre class="text-xs font-mono text-zinc-400"><span class="text-violet-400">import</span> { getClaimsForHandle } <span class="text-violet-400">from</span> <span class="text-green-400">'@keytrace/claims'</span>;

<span class="text-violet-400">const</span> result = <span class="text-violet-400">await</span> getClaimsForHandle(<span class="text-green-400">'{{ handle }}'</span>);</pre>
        </div>
      </div>
    </div>

    <!-- Verification Process -->
    <div v-if="status === 'complete' && result" class="mb-8">
      <div v-if="result.claims.length === 0" class="bg-kt-card border border-zinc-800 rounded-lg p-8 text-center">
        <p class="text-zinc-400">No claims found for this user.</p>
        <p class="text-sm text-zinc-500 mt-2">This user hasn't created any Keytrace identity claims yet.</p>
      </div>

      <VerificationProcess v-else :result="result" />
    </div>

    <!-- Documentation - always visible -->
    <div class="space-y-6">
      <div class="bg-kt-card border border-zinc-800 rounded-lg p-5">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">Quick Start</h2>
        <div class="bg-zinc-900 border border-zinc-800 rounded p-4 overflow-x-auto">
          <pre
            class="text-xs text-zinc-300 font-mono"
          ><span class="text-violet-400">import</span> { getClaimsForHandle } <span class="text-violet-400">from</span> <span class="text-green-400">'@keytrace/claims'</span>;

<span class="text-violet-400">const</span> result = <span class="text-violet-400">await</span> getClaimsForHandle(<span class="text-green-400">'alice.bsky.social'</span>);

console.log(<span class="text-green-400">`${result.summary.verified}/${result.summary.total} claims verified`</span>);

<span class="text-violet-400">for</span> (<span class="text-violet-400">const</span> claim <span class="text-violet-400">of</span> result.claims) {
  <span class="text-violet-400">if</span> (claim.verified) {
    console.log(<span class="text-green-400">`</span><span class="text-zinc-500">&#10003;</span> <span class="text-green-400">${claim.type}: ${claim.identity.subject}`</span>);
  }
}</pre>
        </div>
      </div>

      <div class="bg-kt-card border border-zinc-800 rounded-lg p-5">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">How It Works</h2>
        <div class="text-sm text-zinc-400 space-y-3">
          <p>Enter a handle above to see the verification process in action. The library performs these steps:</p>
          <ol class="list-decimal list-inside space-y-2 text-zinc-500">
            <li>Resolves the handle to a DID via the public ATProto API</li>
            <li>Locates the user's Personal Data Server (PDS) from their DID document</li>
            <li>Fetches all <code class="font-mono text-xs bg-zinc-800 px-1 rounded">dev.keytrace.claim</code> records</li>
            <li>Verifies each claim's cryptographic signature using Web Crypto</li>
          </ol>
        </div>
      </div>

      <div class="bg-kt-card border border-zinc-800 rounded-lg p-5">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">Platform Support</h2>
        <div class="flex flex-wrap gap-2">
          <span class="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">Node.js 18+</span>
          <span class="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">Modern Browsers</span>
          <span class="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">Deno</span>
          <span class="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded">Cloudflare Workers</span>
        </div>
        <p class="text-xs text-zinc-500 mt-3">Zero runtime dependencies - uses standard fetch and crypto.subtle APIs.</p>
      </div>
    </div>

    <!-- Footer link -->
    <div class="mt-12 pt-8 border-t border-zinc-800/50">
      <a
        href="https://github.com/orta/keytrace/tree/main/packages/claims"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <GithubIcon class="w-4 h-4" />
        View on GitHub
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Copy as CopyIcon, Check as CheckIcon, Loader2 as LoaderIcon, AlertCircle as AlertCircleIcon, Github as GithubIcon } from "lucide-vue-next";

const { handle, status, result, error, verify, reset } = useVerifyDemo();

useSeoMeta({
  title: "Developers - @keytrace/claims",
  ogTitle: "Verify Keytrace Claims - @keytrace/claims",
  description: "Verify identity claims in the browser or Node.js. Zero runtime dependencies.",
  ogDescription: "Verify identity claims in the browser or Node.js. Zero runtime dependencies.",
  twitterCard: "summary_large_image",
});

defineOgImageComponent("Developer");

const handleInput = ref("");
const copied = ref(false);

// Fetch recent handles from the API
const { data: recentClaims } = await useFetch("/api/recent-claims");

const recentHandles = computed(() => {
  if (!recentClaims.value) return [];
  const handles = new Set<string>();
  for (const claim of recentClaims.value) {
    if (claim.handle && handles.size < 5) {
      handles.add(claim.handle);
    }
  }
  return Array.from(handles);
});

function selectHandle(h: string) {
  handleInput.value = h;
  runVerify();
}

function runVerify() {
  if (handleInput.value.trim()) {
    verify(handleInput.value.trim());
  }
}

async function copyInstall() {
  await navigator.clipboard.writeText("npm install @keytrace/claims");
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}
</script>
