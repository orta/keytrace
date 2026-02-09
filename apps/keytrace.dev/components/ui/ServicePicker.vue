<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <button
      v-for="service in services"
      :key="service.id"
      class="flex items-center gap-3 p-4 rounded-xl border border-zinc-800 bg-kt-surface hover:border-violet-500/50 hover:bg-kt-elevated transition-all text-left group"
      @click="$emit('select', service)"
    >
      <div class="w-10 h-10 rounded-lg bg-zinc-800 group-hover:bg-violet-600/20 flex items-center justify-center transition-colors">
        <component :is="service.icon" class="w-5 h-5 text-zinc-300 group-hover:text-violet-400 transition-colors" />
      </div>
      <div>
        <span class="text-sm font-medium text-zinc-200">{{ service.name }}</span>
        <span class="block text-xs text-zinc-500">{{ service.description }}</span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  icon: Component;
}

defineProps<{
  services: ServiceOption[];
}>();

defineEmits<{
  select: [service: ServiceOption];
}>();
</script>
