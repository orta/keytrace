on
<template>
  <div class="inline-flex items-center gap-2.5 font-mono text-[11px] text-zinc-500 tracking-[0.14em] uppercase">
    <span class="text-violet-400">{{ num }}</span>
    <span class="w-6 h-px bg-zinc-700 inline-block" />
    {{ label }}
  </div>
</template>

<script setup lang="ts">
defineProps<{ num: string; label: string }>();
</script>
