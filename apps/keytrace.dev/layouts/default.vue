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
              <NuxtLink :to="`/${session.handle}`" class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 no-underline" @click="menuOpen = false">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </NuxtLink>
              <NuxtLink to="/settings" class="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 no-underline" @click="menuOpen = false">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                Settings
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
        <button v-else class="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-medium rounded-lg transition-all hover:shadow-glow-brand" @click="openLoginModal">Sign in &rarr;</button>
      </template>
    </NavBar>

    <!-- Reauth banner: shown when the user's session is missing new scopes -->
    <div v-if="session?.authenticated && session.needsReauth" class="bg-violet-950 border-b border-violet-500/20 px-4 py-2">
      <p class="max-w-5xl mx-auto text-xs text-violet-300/90 text-center">
        Keytrace needs additional permissions.
        <button class="underline hover:text-violet-200 ml-1" @click="reauthorize">Re-authorize</button>
        to enable all features.
      </p>
    </div>

    <main>
      <slot />
    </main>

    <!-- Use homepage footer on index, simple footer on other pages -->
    <HomepageFooter v-if="isHomepage" />
    <footer v-else class="border-t border-zinc-800/50 mt-16">
      <div class="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <KeytraceLogo :height="24" />
          <div class="flex items-center gap-4 flex-wrap">
            <NuxtLink to="/services" class="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Service Providers</NuxtLink>
            <NuxtLink to="/developers" class="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Tools for Developers</NuxtLink>
            <NuxtLink to="/blog" class="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Blog</NuxtLink>
            <a href="https://github.com/orta/keytrace" target="_blank" rel="noopener" class="text-zinc-600 hover:text-zinc-400 transition-colors" aria-label="GitHub">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
            </a>
          </div>
        </div>
        <span class="text-xs text-zinc-600">
          Identity verification for ATProto by <a href="https://bsky.app/profile/orta.io" target="_blank" rel="noopener" class="underline hover:text-zinc-400">@orta.io</a>
        </span>
      </div>
    </footer>
    <LoginModal />
  </div>
</template>

<script setup lang="ts">
import { User as UserIcon } from "lucide-vue-next";

const route = useRoute();
const { session, logout, login } = useSession();
const { open: openLoginModal } = useLoginModal();
const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const isHomepage = computed(() => route.path === "/");

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

function reauthorize() {
  if (session.value?.handle) {
    login(session.value.handle);
  }
}
</script>
