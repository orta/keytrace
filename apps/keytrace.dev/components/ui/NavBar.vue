<template>
  <div class="sticky top-0 z-40">
    <nav class="backdrop-blur-[14px] bg-kt-root/80 border-b border-zinc-800/50">
      <div class="max-w-[1120px] mx-auto grid grid-cols-[1fr_auto_1fr] items-center px-5 h-14 gap-4">
        <!-- Left: logo + version -->
        <div class="flex items-center gap-3.5">
          <NuxtLink to="/" class="flex items-center gap-2 no-underline">
            <KeytraceLogo :height="24" />
          </NuxtLink>
          <span class="hidden sm:inline font-mono text-[10px] text-zinc-600 tracking-[0.06em] px-[7px] py-0.5 border border-zinc-800 rounded">v1.3.0-beta</span>
        </div>

        <!-- Center: nav links -->
        <div class="hidden md:flex gap-1 items-center">
          <NuxtLink to="/services" class="text-[13px] text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-md transition-colors no-underline">Services</NuxtLink>
          <NuxtLink to="/developers" class="text-[13px] text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-md transition-colors no-underline">Docs</NuxtLink>
          <NuxtLink to="/blog" class="text-[13px] text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-md transition-colors no-underline">Blog</NuxtLink>
        </div>

        <!-- Right: status + search + actions -->
        <div class="flex items-center gap-2.5 justify-end">
          <!-- Status lamp -->
          <div class="hidden lg:flex items-center gap-1.5 font-mono text-[10px] text-zinc-500">
            <span class="w-1.5 h-1.5 rounded-full bg-verified animate-kt-pulse" style="box-shadow: 0 0 0 3px rgba(34,197,94,0.13)" />
            runner: healthy
          </div>

          <!-- Add claim (when authenticated) -->
          <NuxtLink v-if="showAddClaim" to="/add" class="sm:px-3 sm:py-1.5 p-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors no-underline">
            <PlusIcon class="w-5 h-5 sm:hidden" />
            <span class="hidden sm:inline">Add claim</span>
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
        Keytrace has just launched. Read more on <NuxtLink to="/blog/introducing-keytrace" class="underline text-amber-300">the blog</NuxtLink>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus as PlusIcon, User as UserIcon, TriangleAlert as TriangleAlertIcon } from "lucide-vue-next";

defineProps<{
  avatarUrl?: string;
  showAddClaim?: boolean;
}>();
</script>
