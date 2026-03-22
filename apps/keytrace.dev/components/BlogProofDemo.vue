<script setup lang="ts">
const PROOF = "I'm linking my keytrace.dev: did:plc:t732otzqvkch7zz5d37537ry";

const instructions = [
  "Post a new **public post** on Instagram",
  "Paste the verification content below as the post caption",
  "Make sure the post is **public** (not private or for close friends)",
  "Copy the URL of the post (tap ... → Copy link)",
  "Paste the post URL below",
];
</script>

<template>
  <div class="my-6 rounded-xl border border-zinc-800 bg-kt-surface px-6 pt-2 pb-6">
    <h2 class="text-xl font-semibold text-zinc-100 tracking-tight">Create your proof</h2>

    <ol class="mt-5 space-y-4">
      <li v-for="(instruction, i) in instructions" :key="i" class="flex gap-3">
        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center font-mono">
          {{ i + 1 }}
        </span>
        <span class="text-sm text-zinc-300 pt-0.5">
          <Markdown :content="instruction" />
        </span>
      </li>
    </ol>

    <div class="mt-5 relative">
      <div class="rounded-lg bg-kt-inset border border-zinc-800 p-4 font-mono text-sm text-emerald-400 break-all pr-10">{{ PROOF }}</div>
      <div class="absolute top-3 right-3">
        <CopyButton :value="PROOF" />
      </div>
    </div>

    <div class="mt-5">
      <label class="block text-xs text-zinc-500 mb-1.5">Instagram Post URL</label>
      <div class="rounded-lg border border-zinc-800 bg-kt-inset px-3 py-2 text-sm text-zinc-600 font-mono">https://www.instagram.com/p/...</div>
    </div>
  </div>
</template>
