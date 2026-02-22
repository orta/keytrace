<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-zinc-100 tracking-tight">Settings</h1>
      <p class="text-sm text-zinc-500 mt-1">Customize your keytrace profile.</p>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="space-y-6">
      <SkeletonLoader variant="card" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16 rounded-xl border border-zinc-800/50 bg-kt-surface">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-failed/10 mb-4">
        <AlertCircleIcon class="w-8 h-8 text-failed" />
      </div>
      <h3 class="text-lg font-semibold text-zinc-200 mb-2">Failed to load settings</h3>
      <button class="px-4 py-2 text-sm text-violet-400 hover:text-violet-300 transition-colors" @click="refresh()">Try again</button>
    </div>

    <!-- Form -->
    <form v-else class="space-y-6" @submit.prevent="save">
      <!-- Display Name -->
      <div>
        <label for="displayName" class="block text-sm font-medium text-zinc-300 mb-1.5">Display name</label>
        <input
          id="displayName"
          v-model="form.displayName"
          type="text"
          maxlength="128"
          placeholder="Override your Bluesky display name"
          class="w-full px-3 py-2 rounded-lg bg-kt-inset border border-zinc-700 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
        />
        <p class="text-xs text-zinc-600 mt-1">Leave blank to use your Bluesky display name.</p>
      </div>

      <!-- Bio -->
      <div>
        <label for="bio" class="block text-sm font-medium text-zinc-300 mb-1.5">Bio</label>
        <textarea
          id="bio"
          v-model="form.bio"
          maxlength="1024"
          rows="4"
          placeholder="Tell people about yourself"
          class="w-full px-3 py-2 rounded-lg bg-kt-inset border border-zinc-700 text-zinc-200 placeholder-zinc-600 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-none"
        />
        <p class="text-xs text-zinc-600 mt-1">{{ form.bio.length }}/1024</p>
      </div>

      <!-- Scope error -->
      <div v-if="scopeError" class="px-4 py-3 rounded-lg bg-amber-950 border border-amber-500/30 text-sm text-amber-300">
        Keytrace needs additional permissions to save profile settings.
        <button class="underline hover:text-amber-200 ml-1" @click="reauthorize">Re-authorize</button>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 pt-2">
        <button
          type="submit"
          :disabled="saving"
          class="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand"
        >
          {{ saving ? "Saving..." : "Save" }}
        </button>
        <span v-if="saved" class="text-sm text-verified">Saved!</span>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { AlertCircle as AlertCircleIcon } from "lucide-vue-next";

const { session, login } = useSession();

// Redirect if not authenticated
watch(
  () => session.value,
  (s) => {
    if (s && !s.authenticated) {
      navigateTo("/");
    }
  },
  { immediate: true },
);

const { data: profile, pending, error, refresh } = await useFetch("/api/settings/profile");

const form = reactive({
  displayName: "",
  bio: "",
});

// Populate form when data loads
watch(
  profile,
  (p) => {
    if (p) {
      form.displayName = p.displayName ?? "";
      form.bio = p.bio ?? "";
    }
  },
  { immediate: true },
);

const saving = ref(false);
const saved = ref(false);
const scopeError = ref(false);

function reauthorize() {
  if (session.value?.handle) {
    login(session.value.handle);
  }
}

async function save() {
  saving.value = true;
  saved.value = false;

  try {
    await $fetch("/api/settings/profile", {
      method: "PUT",
      body: {
        displayName: form.displayName || undefined,
        bio: form.bio || undefined,
      },
    });
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 3000);
  } catch (err: unknown) {
    const status = (err as any)?.response?.status;
    if (status === 403) {
      scopeError.value = true;
    }
  } finally {
    saving.value = false;
  }
}
</script>
