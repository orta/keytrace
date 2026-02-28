<template>
  <div class="max-w-3xl mx-auto px-4 py-12">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-zinc-100 mb-2">Keytrace</h1>
      <p class="text-zinc-200">Keytrace takes ideas from Keybase and Keyoxide and brings them to the decentralized web.</p>
      <p class="text-zinc-400 text-md-start mt-4">
        The site lets you create proofs that you own a certain identity (like a GitHub account, website address, or social media profile) and have that stored in your user registry
        in atproto.
      </p>
      <p class="text-zinc-400 text-md-start mt-4">
        All of the identity claims are public and can be independently verified by anyone using the same steps using an npm module or by re-running them in this website. Below are
        the services we support for verifying your identity:
      </p>
    </div>

    <div v-if="pending" class="space-y-4">
      <div v-for="i in 4" :key="i" class="animate-pulse bg-kt-card border border-zinc-800 rounded-lg p-5">
        <div class="h-5 w-32 bg-zinc-800 rounded mb-2" />
        <div class="h-4 w-64 bg-zinc-800/60 rounded" />
      </div>
    </div>

    <div v-else-if="services" class="space-y-4">
      <NuxtLink
        v-for="service in services"
        :key="service.id"
        :to="`/services/${service.id}`"
        class="block bg-kt-card border border-zinc-800 rounded-lg p-5 hover:border-zinc-700 transition-colors group"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <GithubIcon
              v-if="service.id === 'github'"
              class="w-6 h-6 mt-0.5 text-zinc-400"
            />
            <FileCodeIcon
              v-else-if="service.id === 'tangled'"
              class="w-6 h-6 mt-0.5 text-zinc-400"
            />
            <img
              v-else-if="service.homepage"
              :src="`https://www.google.com/s2/favicons?domain=${getDomain(service.homepage)}&sz=32`"
              :alt="`${service.name} favicon`"
              class="w-6 h-6 mt-0.5 rounded"
            />
            <div>
              <h2 class="text-lg font-semibold text-zinc-200 group-hover:text-violet-400 transition-colors">
                {{ service.name }}
              </h2>
              <p class="text-sm text-zinc-500 mt-1">
                {{ service.description }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 text-zinc-500">
            <span v-if="service.homepage" class="text-xs">{{ getDomain(service.homepage) }}</span>
            <ArrowRightIcon class="w-4 h-4 group-hover:text-violet-400 transition-colors" />
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Info section -->
    <div class="mt-12 bg-kt-card border border-zinc-800 rounded-lg p-6">
      <h2 class="text-sm font-semibold text-zinc-300 mb-3">How Verification Works</h2>
      <div class="text-sm text-zinc-400 space-y-3">
        <p>Each Keytrace service defines a specific way to verify ownership of an external identity. The process is fully transparent and reproducible:</p>
        <ol class="list-decimal list-inside space-y-2 text-zinc-500">
          <li>You create a proof at the external service (e.g., a GitHub gist, DNS TXT record)</li>
          <li>The proof contains your ATProto DID to link the identities</li>
          <li>Keytrace fetches the proof from the public URL</li>
          <li>The runner checks if your DID is present in the expected location</li>
          <li>If verified, Keytrace signs an attestation and stores it in your ATProto repo</li>
        </ol>
        <p class="text-xs text-zinc-600 pt-2">Anyone can re-run verification using the same steps to independently confirm your claims.</p>
      </div>
    </div>

    <a href="https://orta.io" target="_blank" class="mt-8 block text-right text-sm font-mono text-violet-400/80 hover:text-violet-400 transition-colors">./orta</a>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight as ArrowRightIcon, Github as GithubIcon, FileCode as FileCodeIcon } from "lucide-vue-next";

const { data: services, pending } = await useFetch("/api/services");

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
</script>
