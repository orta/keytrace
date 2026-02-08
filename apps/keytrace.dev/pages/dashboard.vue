<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-semibold text-zinc-100 tracking-tight">
          Your Claims
        </h1>
        <p class="text-sm text-zinc-500 mt-1">
          Manage your linked accounts and identity proofs.
        </p>
      </div>
      <NuxtLink
        to="/add"
        class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand flex items-center gap-2"
      >
        <PlusIcon class="w-4 h-4" />
        <span class="hidden sm:inline">Add claim</span>
      </NuxtLink>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="space-y-4">
      <SkeletonLoader variant="card" />
      <SkeletonLoader variant="card" />
    </div>

    <!-- Error state -->
    <div
      v-else-if="error"
      class="text-center py-16 rounded-xl border border-zinc-800/50 bg-kt-surface"
    >
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-failed/10 mb-4">
        <AlertCircleIcon class="w-8 h-8 text-failed" />
      </div>
      <h3 class="text-lg font-semibold text-zinc-200 mb-2">
        Failed to load claims
      </h3>
      <p class="text-sm text-zinc-500 mb-6">
        Something went wrong while fetching your claims. Please try again.
      </p>
      <button
        class="px-4 py-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        @click="refresh()"
      >
        Try again
      </button>
    </div>

    <!-- Claims list -->
    <template v-else-if="claims">
      <div v-if="claims.claims && claims.claims.length > 0" class="space-y-3">
        <div
          v-for="claim in claims.claims"
          :key="claim.uri"
          class="group rounded-xl border border-zinc-800 bg-kt-surface hover:border-zinc-700 transition-all"
        >
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <component :is="getServiceIcon(claim.claimUri)" class="w-4 h-4 text-zinc-300" />
              </div>
              <div class="min-w-0">
                <span class="text-sm font-medium text-zinc-200 block truncate">
                  {{ claim.claimUri }}
                </span>
                <span v-if="claim.comment" class="text-xs text-zinc-500">
                  {{ claim.comment }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2 ml-4">
              <button
                class="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Re-verify"
                @click="reverify(claim)"
              >
                <RefreshCwIcon class="w-4 h-4" />
              </button>
              <button
                class="p-2 rounded-lg text-zinc-500 hover:text-failed hover:bg-failed/10 transition-colors"
                title="Delete claim"
                @click="deleteClaim(claim)"
              >
                <Trash2Icon class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="text-center py-16 rounded-xl border border-zinc-800/50 bg-kt-surface"
      >
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/10 mb-4">
          <LinkIcon class="w-8 h-8 text-violet-400" />
        </div>
        <h3 class="text-lg font-semibold text-zinc-200 mb-2">
          No linked accounts yet
        </h3>
        <p class="text-sm text-zinc-500 max-w-sm mx-auto mb-6">
          Start by connecting your GitHub account or verifying a domain you own.
        </p>
        <NuxtLink
          to="/add"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand"
        >
          <PlusIcon class="w-4 h-4" />
          Add your first claim
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  Plus as PlusIcon,
  AlertCircle as AlertCircleIcon,
  Link as LinkIcon,
  RefreshCw as RefreshCwIcon,
  Trash2 as Trash2Icon,
  Github,
  Globe,
  AtSign,
  Key,
} from "lucide-vue-next"
import type { Component } from "vue"

const { session } = useSession()

// Redirect to home if not authenticated
watch(
  () => session.value,
  (s) => {
    if (s && !s.authenticated) {
      navigateTo("/")
    }
  },
  { immediate: true },
)

const { data: claims, pending, error, refresh } = await useFetch("/api/claims")

const serviceIcons: Record<string, Component> = {
  github: Github,
  domain: Globe,
  dns: Globe,
  mastodon: AtSign,
}

function getServiceIcon(uri: string): Component {
  if (uri.includes("github.com")) return serviceIcons.github
  if (uri.startsWith("dns:")) return serviceIcons.dns
  if (uri.includes("mastodon")) return serviceIcons.mastodon
  return Key
}

async function reverify(claim: any) {
  try {
    await $fetch("/api/verify", {
      method: "POST",
      body: {
        claimUri: claim.claimUri,
        did: claims.value?.did,
      },
    })
    await refresh()
  } catch {
    // Error handling could be improved with toast notifications
  }
}

async function deleteClaim(claim: any) {
  // Extract rkey from the AT URI (at://did/collection/rkey)
  const parts = claim.uri?.split("/")
  const rkey = parts?.[parts.length - 1]
  if (!rkey) return

  try {
    await $fetch(`/api/claims/${rkey}`, { method: "DELETE" })
    await refresh()
  } catch {
    // Error handling could be improved with toast notifications
  }
}
</script>
