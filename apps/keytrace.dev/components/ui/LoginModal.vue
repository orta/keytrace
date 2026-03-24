<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

        <!-- Modal -->
        <div class="relative bg-kt-card border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
          <button class="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors" @click="close">
            <XIcon class="w-5 h-5" />
          </button>

          <div class="text-center mb-6">
            <div class="flex justify-center mb-4">
              <svg width="69" height="32" viewBox="0 0 381 176" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(-14deg)">
                <path d="M183.816 58L341.416 58L380.816 58L380.816 97L341.416 123L315.15 110L288.883 123L275.75 110L249.483 123L223.216 123L183.816 110L183.816 58Z" fill="#7C3AED" />
                <path d="M184.406 41.3794L156.318 41L155.002 138.431L183.09 138.81L197.322 125.081L198.259 55.6895L184.406 41.3794Z" fill="#7C3AED" />
                <path d="M178.816 71H380.816V82H188.109L178.816 76.5V71Z" fill="transparent" />
                <path d="M357.077 109.534H320.21L314.942 106.9L309.675 109.534H278.074L275.44 106.9L270.173 109.534H187.328L178 104.267V99H372.879L357.077 109.534Z" fill="transparent" />
                <path d="M90.704 176C76.3928 176 63.6275 174.066 52.4082 170.197C41.1889 166.372 31.6923 160.745 23.9183 153.316C16.1443 145.93 10.2255 136.94 6.16178 126.345C2.0981 115.751 0.0441709 103.683 0 90.143C0.0441709 76.7348 2.0981 64.5354 6.16178 53.5451C10.2696 42.5107 16.2547 33.0151 24.1171 25.058C32.0236 17.057 41.6969 10.8805 53.137 6.52829C64.6214 2.1761 77.7179 0 92.4267 0C105.855 0 117.913 1.89034 128.602 5.67103C139.292 9.45171 148.391 14.9029 155.9 22.0247C163.453 29.1465 169.217 37.7409 173.192 47.8081C177.168 57.8753 179.133 69.2393 179.089 81.9003C179.133 90.5607 178.294 98.3199 176.571 105.178C174.849 112.036 172.221 117.905 168.687 122.785C165.198 127.664 160.78 131.511 155.436 134.324C150.135 137.094 143.885 138.743 136.685 139.27C130.855 139.754 126.438 139.402 123.434 138.215C120.431 137.028 118.311 135.314 117.074 133.071C115.837 130.785 114.976 128.236 114.49 125.422H113.695C112.679 128.104 110.448 130.5 107.003 132.61C103.602 134.676 99.5381 136.237 94.8119 137.292C90.0856 138.391 85.2269 138.787 80.2356 138.479C75.2002 138.127 70.2972 136.94 65.5268 134.918C60.7564 132.852 56.4498 129.84 52.607 125.884C48.8083 121.883 45.7827 116.85 43.53 110.783C41.3214 104.716 40.1951 97.5725 40.1509 89.3517C40.1951 81.1309 41.3435 74.0751 43.5962 68.1843C45.8931 62.2495 48.8746 57.3258 52.5407 53.4132C56.2511 49.4567 60.3147 46.4014 64.7318 44.2472C69.1488 42.0492 73.4775 40.6204 77.7179 39.961C82.8417 39.0818 87.7888 39.0158 92.5592 39.7632C97.3296 40.5105 101.349 41.7195 104.618 43.39C107.931 45.0605 109.984 46.8629 110.779 48.7972H111.773V41.4117H134.698V107.354C134.786 110.212 135.36 112.278 136.42 113.553C137.481 114.827 138.85 115.465 140.528 115.465C143.09 115.465 145.343 114.212 147.286 111.706C149.274 109.156 150.798 105.266 151.858 100.034C152.962 94.759 153.492 88.0549 153.448 79.922C153.492 70.8659 152.3 63.1287 149.87 56.7103C147.485 50.248 144.239 44.9067 140.131 40.6863C136.023 36.466 131.341 33.1689 126.085 30.795C120.872 28.3771 115.351 26.6846 109.521 25.7175C103.69 24.7503 97.948 24.2667 92.2942 24.2667C81.0307 24.2667 71.2911 25.9593 63.0754 29.3443C54.8597 32.6854 48.0575 37.3233 42.6687 43.2581C37.2799 49.1929 33.2603 56.0729 30.6101 63.898C28.004 71.6792 26.679 80.0319 26.6348 88.9561C26.679 99.1112 28.1366 108.101 31.0077 115.927C33.8787 123.708 38.097 130.236 43.6625 135.511C49.228 140.787 56.0965 144.765 64.268 147.447C72.4837 150.173 81.892 151.535 92.4929 151.535C97.6609 151.535 102.696 151.206 107.599 150.546C112.502 149.887 116.963 149.052 120.983 148.04C125.047 147.029 126.509 145.81 130.987 144.875C135.466 143.94 141.102 142.33 145.172 140.8C149.242 139.27 147.579 140.01 162.002 129.969C176.425 119.928 141.107 157.046 127.012 171.054C122.153 172.549 116.588 173.736 110.316 174.615C104.088 175.538 97.5504 176 90.704 176ZM89.1139 114.014C94.3702 114.014 98.5222 113.047 101.57 111.113C104.618 109.134 106.782 106.233 108.063 102.408C109.344 98.5837 109.918 93.9018 109.786 88.3626C109.786 83.7906 109.211 79.7461 108.063 76.2292C106.915 72.7123 104.839 69.9427 101.835 67.9205C98.8314 65.8983 94.5027 64.8872 88.8489 64.8872C83.9901 64.8872 79.8602 65.8323 76.4591 67.7227C73.1021 69.613 70.5181 72.3166 68.7071 75.8336C66.9403 79.3505 66.0569 83.5928 66.0569 88.5604C66.0569 92.9126 66.7857 97.045 68.2433 100.958C69.701 104.826 72.1083 107.969 75.4652 110.387C78.8222 112.805 83.3717 114.014 89.1139 114.014Z" fill="#7C3AED" />
                <path d="M176.838 122.455C180.902 111.465 182.956 99.2652 183 85.8569L156.365 87.0439C156.321 95.9681 154.996 104.321 152.39 112.102C149.74 119.927 145.72 126.807 140.331 132.742C134.943 138.677 128.14 143.315 119.925 146.656C111.709 150.041 101.969 151.733 90.7059 151.733C85.052 151.733 79.3099 151.25 73.4794 150.283C67.6489 149.315 62.1276 147.623 56.9155 145.205L90.5733 176C105.282 176 118.379 173.824 129.863 169.472C141.303 165.12 150.976 158.943 158.883 150.942C166.745 142.985 172.73 133.489 176.838 122.455Z" fill="#7C3AED" />
              </svg>
            </div>
            <h2 class="text-lg font-semibold text-zinc-100">Sign in to keytrace</h2>
            <p class="text-sm text-zinc-500 mt-1">Enter your <a href="https://internethandle.org/" class="text-violet-400 hover:underline">internet handle</a> to continue</p>
          </div>

          <form @submit.prevent="handleLogin">
            <input
              ref="handleInput"
              :value="handle"
              @input="handle = ($event.target as HTMLInputElement).value.replace(/^@/, '')"
              type="text"
              placeholder="you.bsky.social"
              class="w-full px-4 py-2.5 rounded-lg bg-kt-inset border border-zinc-800 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
            <button type="submit" class="w-full mt-3 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all">
              {{ signInLabel }}
            </button>
          </form>

          <p class="text-xs text-zinc-600 text-center mt-4">You'll be redirected to authorize with your PDS</p>
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
const pdsHost = ref<string | null>(null);
const pdsLoading = ref(false);
let resolveTimer: ReturnType<typeof setTimeout> | null = null;

const signInLabel = computed(() => {
  if (!pdsHost.value || pdsHost.value === "bsky.social") return "Sign in with Bluesky";
  return `Sign in with ${pdsHost.value}`;
});

watch(handle, (val) => {
  if (resolveTimer) clearTimeout(resolveTimer);
  pdsHost.value = null;
  if (!val.includes(".")) return;
  pdsLoading.value = true;
  resolveTimer = setTimeout(() => resolvePds(val), 200);
});

async function resolvePds(h: string) {
  try {
    const r1 = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(h)}`);
    if (!r1.ok) return;
    const { did } = await r1.json();

    let didDocUrl: string;
    if (did.startsWith("did:plc:")) {
      didDocUrl = `https://plc.directory/${did}`;
    } else if (did.startsWith("did:web:")) {
      didDocUrl = `https://${did.slice("did:web:".length)}/.well-known/did.json`;
    } else {
      return;
    }

    const r2 = await fetch(didDocUrl);
    if (!r2.ok) return;
    const doc = await r2.json();

    const svc = doc.service?.find((s: any) => s.id === "#atproto_pds");
    if (svc?.serviceEndpoint) {
      pdsHost.value = new URL(svc.serviceEndpoint).hostname;
    }
  } catch {
    // silently fall back to default label
  } finally {
    pdsLoading.value = false;
  }
}

// Focus input when modal opens
watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      handleInput.value?.focus();
    });
  } else {
    handle.value = "";
    pdsHost.value = null;
    if (resolveTimer) clearTimeout(resolveTimer);
  }
});

function handleLogin() {
  if (handle.value) {
    login(handle.value.replace(/^@/, ""));
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
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
