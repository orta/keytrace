<template>
  <div class="animate-pulse space-y-4">
    <!-- Profile skeleton -->
    <div v-if="variant === 'profile'" class="flex items-start gap-5">
      <div class="w-20 h-20 rounded-full bg-zinc-800" />
      <div class="flex-1 space-y-3">
        <div class="h-6 w-48 bg-zinc-800 rounded" />
        <div class="h-4 w-32 bg-zinc-800/60 rounded" />
        <div class="h-3 w-64 bg-zinc-800/40 rounded" />
      </div>
    </div>

    <!-- Card skeleton -->
    <div v-else-if="variant === 'card'" class="rounded-xl border border-zinc-800 bg-kt-surface overflow-hidden">
      <div class="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-800/50">
        <div class="w-8 h-8 rounded-lg bg-zinc-800" />
        <div class="h-4 w-24 bg-zinc-800 rounded" />
        <div class="ml-auto h-5 w-16 bg-zinc-800/60 rounded-full" />
      </div>
      <div class="px-4 py-3 space-y-2">
        <div class="h-4 w-48 bg-zinc-800/60 rounded" />
        <div class="h-3 w-36 bg-zinc-800/40 rounded" />
      </div>
    </div>

    <!-- Row skeleton -->
    <div v-else class="flex items-center gap-3 px-4 py-3 rounded-lg bg-kt-surface border border-zinc-800/50">
      <div class="w-8 h-8 rounded-full bg-zinc-800" />
      <div class="flex-1 space-y-2">
        <div class="h-4 w-32 bg-zinc-800 rounded" />
        <div class="h-3 w-48 bg-zinc-800/60 rounded" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  variant?: "profile" | "card" | "row"
}>()
</script>
