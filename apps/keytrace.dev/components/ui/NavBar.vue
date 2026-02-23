<template>
  <div class="sticky top-0 z-40">
    <nav class="backdrop-blur-lg bg-kt-root/80 border-b border-zinc-800/50">
      <div class="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
        <NuxtLink to="/" class="flex items-center gap-2">
          <!-- Logomark -->
          <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/15 border border-violet-500/20">
            <span class="font-mono text-sm font-bold text-violet-400">kt</span>
          </div>
          <span class="font-semibold text-zinc-200 text-sm hidden sm:block"> keytrace </span>
          <span class="px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded">beta</span>
        </NuxtLink>

        <!-- Mobile: icon buttons. Desktop: full nav -->
        <div class="flex items-center gap-2">
          <NuxtLink v-if="showAddClaim" to="/add" class="sm:px-3 sm:py-1.5 p-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            <PlusIcon class="w-5 h-5 sm:hidden" />
            <span class="hidden sm:inline">Add claim</span>
          </NuxtLink>
          <NuxtLink v-if="showAddClaim" to="/settings" class="sm:px-3 sm:py-1.5 p-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            <SettingsIcon class="w-5 h-5 sm:hidden" />
            <span class="hidden sm:inline">Settings</span>
          </NuxtLink>

          <!-- Avatar/login button -->
          <slot name="user">
            <button class="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center">
              <img v-if="avatarUrl" :src="avatarUrl" class="w-full h-full object-cover" />
              <UserIcon v-else class="w-4 h-4 text-zinc-500" />
            </button>
          </slot>
        </div>
      </div>
    </nav>
    <!-- Beta warning banner -->
    <div class="bg-amber-950 border-b border-amber-500/20 px-4 py-2">
      <p class="max-w-5xl mx-auto text-xs text-amber-300/90 text-center">
        <TriangleAlertIcon class="w-3 h-3 inline-block mr-1 -mt-0.5" />
        Keytrace is in beta. You likely will need to re-verify your claims when it goes live.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus as PlusIcon, User as UserIcon, TriangleAlert as TriangleAlertIcon, Settings as SettingsIcon } from "lucide-vue-next";

defineProps<{
  avatarUrl?: string;
  showAddClaim?: boolean;
}>();
</script>
