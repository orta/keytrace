<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

        <!-- Modal -->
        <div class="relative bg-kt-card border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
          <button
            class="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
            @click="close"
          >
            <XIcon class="w-5 h-5" />
          </button>

          <div class="text-center mb-6">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/15 border border-violet-500/20 mb-4">
              <span class="font-mono text-sm font-bold text-violet-400">kt</span>
            </div>
            <h2 class="text-lg font-semibold text-zinc-100">Sign in to keytrace</h2>
            <p class="text-sm text-zinc-500 mt-1">Enter your Bluesky handle to continue</p>
          </div>

          <form @submit.prevent="handleLogin">
            <input
              ref="handleInput"
              v-model="handle"
              type="text"
              placeholder="you.bsky.social"
              class="w-full px-4 py-2.5 rounded-lg bg-kt-inset border border-zinc-800 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
            <button
              type="submit"
              class="w-full mt-3 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all"
            >
              Sign in with Bluesky
            </button>
          </form>

          <p class="text-xs text-zinc-600 text-center mt-4">
            You'll be redirected to authorize with your PDS
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X as XIcon } from "lucide-vue-next";

const { isOpen, close } = useLoginModal();
const { login } = useSession();

const handle = ref("");
const handleInput = ref<HTMLInputElement | null>(null);

// Focus input when modal opens
watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      handleInput.value?.focus();
    });
  } else {
    handle.value = "";
  }
});

function handleLogin() {
  if (handle.value) {
    login(handle.value);
    close();
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
