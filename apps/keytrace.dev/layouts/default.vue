<template>
  <div class="min-h-screen bg-kt-root">
    <NavBar
      :avatar-url="session?.avatar"
      :show-add-claim="session?.authenticated"
    >
      <template #user>
        <NuxtLink
          v-if="session?.authenticated"
          :to="`/${session.handle}`"
          class="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center"
        >
          <img
            v-if="session.avatar"
            :src="session.avatar"
            class="w-full h-full object-cover"
          />
          <UserIcon v-else class="w-4 h-4 text-zinc-500" />
        </NuxtLink>
        <NuxtLink
          v-else
          to="/"
          class="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Sign in
        </NuxtLink>
      </template>
    </NavBar>

    <main>
      <slot />
    </main>

    <footer class="border-t border-zinc-800/50 mt-16">
      <div class="max-w-5xl mx-auto px-4 py-8 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-600/15 border border-violet-500/20">
            <span class="font-mono text-xs font-bold text-violet-400">kt</span>
          </div>
          <span class="text-xs text-zinc-500">keytrace.dev</span>
        </div>
        <span class="text-xs text-zinc-600">
          Identity verification for ATProto
        </span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { User as UserIcon } from "lucide-vue-next"

const { session } = useSession()
</script>
