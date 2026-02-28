<template>
  <div class="max-w-3xl mx-auto px-4 py-12">
    <!-- Back link -->
    <NuxtLink to="/services" class="text-sm text-zinc-500 hover:text-zinc-300 mb-6 inline-flex items-center gap-1">
      <ArrowLeftIcon class="w-4 h-4" />
      All services
    </NuxtLink>

    <div v-if="pending" class="space-y-6 mt-6">
      <div class="animate-pulse">
        <div class="h-8 w-48 bg-zinc-800 rounded mb-2" />
        <div class="h-4 w-64 bg-zinc-800/60 rounded" />
      </div>
      <div class="animate-pulse bg-kt-card border border-zinc-800 rounded-lg p-6">
        <div class="h-4 w-32 bg-zinc-800 rounded mb-3" />
        <div class="h-12 w-full bg-zinc-800/60 rounded" />
      </div>
      <div class="animate-pulse bg-kt-card border border-zinc-800 rounded-lg p-6">
        <div class="h-4 w-32 bg-zinc-800 rounded mb-3" />
        <div class="h-24 w-full bg-zinc-800/60 rounded" />
      </div>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <p class="text-zinc-400">Service not found</p>
      <NuxtLink to="/services" class="text-violet-400 hover:text-violet-300 mt-2 inline-block">
        View all services
      </NuxtLink>
    </div>

    <div v-else-if="recipe" class="space-y-8">
      <!-- Header -->
      <div>
        <h1 class="text-2xl font-bold text-zinc-100 mb-2">{{ recipe.name }} Verification</h1>
        <p class="text-zinc-400">How keytrace verifies {{ recipe.name }} identity claims</p>
      </div>

      <!-- URI Pattern -->
      <section class="bg-kt-card border border-zinc-800 rounded-lg p-6">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">Claim URI Format</h2>
        <code class="block bg-kt-inset px-4 py-3 rounded-lg text-sm font-mono text-violet-400 overflow-x-auto">
          {{ recipe.sampleUri }}
        </code>
        <p class="text-xs text-zinc-500 mt-2">
          Pattern: <code class="text-zinc-400">{{ recipe.uriPattern }}</code>
        </p>
      </section>

      <!-- Create Your Proof -->
      <section v-if="recipe.ui?.instructions" class="bg-kt-card border border-zinc-800 rounded-lg p-6">
        <h2 class="text-sm font-semibold text-zinc-300 mb-4">Create Your Proof</h2>
        <ol class="space-y-3">
          <li v-for="(instruction, idx) in recipe.ui.instructions" :key="idx" class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-xs font-bold">
              {{ idx + 1 }}
            </span>
            <span class="text-sm text-zinc-300 pt-0.5">
              <Markdown :content="instruction" />
            </span>
          </li>
        </ol>
      </section>

      <!-- Proof Text -->
      <section class="bg-kt-card border border-zinc-800 rounded-lg p-6">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">Proof Text</h2>
        <p class="text-zinc-400 text-sm mb-3">
          You need to include this text in your {{ recipe.name }} proof location:
        </p>
        <div class="bg-kt-inset px-4 py-3 rounded-lg flex items-center justify-between gap-4">
          <code class="text-sm font-mono text-emerald-400 break-all">{{ recipe.proofText }}</code>
          <CopyButton :value="recipe.proofText" />
        </div>
        <p v-if="recipe.proofLocation" class="text-xs text-zinc-500 mt-3">
          <span class="text-zinc-400">Where to put it:</span> <Markdown :content="recipe.proofLocation" />
        </p>
      </section>

      <!-- Verification Steps -->
      <section v-if="recipe.verification" class="bg-kt-card border border-zinc-800 rounded-lg p-6">
        <h2 class="text-sm font-semibold text-zinc-300 mb-4">Verification Steps</h2>

        <ol class="space-y-6">
          <!-- Step 1: Fetch -->
          <li class="flex gap-4">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-zinc-200 mb-1">Fetch proof data</h3>
              <p class="text-xs text-zinc-500 mb-2">
                Using the <code class="text-zinc-400">{{ recipe.verification.fetcher }}</code> fetcher
              </p>
              <code class="block bg-kt-inset px-3 py-2 rounded text-xs font-mono text-zinc-300 overflow-x-auto">
                {{ recipe.verification.fetchUrl }}
              </code>
            </div>
          </li>

          <!-- Step 2: Check targets -->
          <li class="flex gap-4">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-zinc-200 mb-1">Search for DID in response</h3>
              <p class="text-xs text-zinc-500 mb-3">
                The runner checks the following locations for your DID:
              </p>
              <ul class="space-y-2">
                <li
                  v-for="(target, idx) in recipe.verification.targets"
                  :key="idx"
                  class="bg-kt-inset px-3 py-2 rounded text-xs"
                >
                  <code class="text-violet-400 font-mono">{{ target.path }}</code>
                  <span class="text-zinc-500 ml-2">{{ target.relation }}</span>
                  <p class="text-zinc-400 mt-1">{{ target.description }}</p>
                </li>
              </ul>
            </div>
          </li>

          <!-- Step 3: Verify -->
          <li class="flex gap-4">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-verified/20 text-verified flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-medium text-zinc-200 mb-1">Attestation</h3>
              <p class="text-xs text-zinc-500">
                If the DID is found, keytrace signs an attestation linking your identity to your ATProto DID and stores it in your repo.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <!-- Try it -->
      <section class="bg-kt-card border border-zinc-800 rounded-lg p-6">
        <h2 class="text-sm font-semibold text-zinc-300 mb-3">Try Verification</h2>
        <p class="text-zinc-400 text-sm mb-4">
          Test verification with your own claim URI and DID:
        </p>

        <form class="space-y-3" @submit.prevent="runVerification">
          <div>
            <label class="block text-xs text-zinc-500 mb-1">Claim URI</label>
            <input
              v-model="testUri"
              type="text"
              :placeholder="recipe.sampleUri"
              class="w-full px-3 py-2 rounded-lg bg-kt-inset border border-zinc-800 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label class="block text-xs text-zinc-500 mb-1">DID</label>
            <input
              v-model="testDid"
              type="text"
              placeholder="did:plc:..."
              class="w-full px-3 py-2 rounded-lg bg-kt-inset border border-zinc-800 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            type="submit"
            :disabled="verifying || !testUri || !testDid"
            class="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-all"
          >
            {{ verifying ? "Verifying..." : "Run Verification" }}
          </button>
        </form>

        <!-- Result -->
        <div v-if="verifyResult" class="mt-4 p-4 rounded-lg" :class="verifyResult.status === 'verified' ? 'bg-verified/10 border border-verified/30' : 'bg-red-500/10 border border-red-500/30'">
          <div class="flex items-center gap-2 mb-2">
            <CheckCircleIcon v-if="verifyResult.status === 'verified'" class="w-5 h-5 text-verified" />
            <XCircleIcon v-else class="w-5 h-5 text-red-400" />
            <span class="text-sm font-medium" :class="verifyResult.status === 'verified' ? 'text-verified' : 'text-red-400'">
              {{ verifyResult.status === "verified" ? "Verified!" : "Verification Failed" }}
            </span>
          </div>
          <div v-if="verifyResult.errors?.length" class="text-xs text-zinc-400 space-y-1">
            <p v-for="(err, i) in verifyResult.errors" :key="i">{{ err }}</p>
          </div>
          <div v-if="verifyResult.identity" class="mt-3 text-xs text-zinc-400">
            <p v-if="verifyResult.identity.subject">Subject: <span class="text-zinc-200">{{ verifyResult.identity.subject }}</span></p>
            <p v-if="verifyResult.identity.avatarUrl">Avatar: <a :href="verifyResult.identity.avatarUrl" target="_blank" class="text-violet-400 hover:underline">{{ verifyResult.identity.avatarUrl }}</a></p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft as ArrowLeftIcon, CheckCircle as CheckCircleIcon, XCircle as XCircleIcon } from "lucide-vue-next";

const route = useRoute();
const providerId = computed(() => route.params.provider as string);

const { data: recipe, pending, error } = await useFetch(`/api/services/${providerId.value}`);

const testUri = ref("");
const testDid = ref("");
const verifying = ref(false);
const verifyResult = ref<{
  status: string;
  errors?: string[];
  identity?: { subject?: string; avatarUrl?: string };
} | null>(null);

async function runVerification() {
  verifying.value = true;
  verifyResult.value = null;

  try {
    const result = await $fetch("/api/verify", {
      method: "POST",
      body: {
        claimUri: testUri.value,
        did: testDid.value,
      },
    });
    verifyResult.value = result as typeof verifyResult.value;
  } catch (err: unknown) {
    verifyResult.value = {
      status: "error",
      errors: [(err as Error).message || "Verification failed"],
    };
  } finally {
    verifying.value = false;
  }
}
</script>
