<template>
  <div class="min-h-screen bg-kt-root">
    <NavBar :avatar-url="session?.avatar" :show-add-claim="session?.authenticated">
      <template #user>
        <div v-if="session?.authenticated" class="relative" ref="menuRef">
          <button class="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center cursor-pointer" @click="menuOpen = !menuOpen">
            <img v-if="session.avatar" :src="session.avatar" class="w-full h-full object-cover" />
            <UserIcon v-else class="w-4 h-4 text-zinc-500" />
          </button>
          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="menuOpen" class="absolute right-0 mt-2 min-w-[180px] rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-50 origin-top-right">
              <NuxtLink :to="`/${session.handle}`" class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" @click="menuOpen = false">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </NuxtLink>
              <div class="h-px bg-zinc-800 my-1" />
              <button class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 w-full" @click="handleLogout">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </Transition>
        </div>
        <NuxtLink v-else to="/" class="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"> Sign in </NuxtLink>
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
        <span class="text-xs text-zinc-600"> Identity verification for ATProto </span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { User as UserIcon } from "lucide-vue-next";

const { session, logout } = useSession();
const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", onClickOutside));
onUnmounted(() => document.removeEventListener("click", onClickOutside));

async function handleLogout() {
  menuOpen.value = false;
  await logout();
  navigateTo("/");
}
</script>
