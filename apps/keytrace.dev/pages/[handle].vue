<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Loading state -->
    <template v-if="pending">
      <SkeletonLoader variant="profile" />
      <div class="mt-8 space-y-4">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    </template>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-20">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-failed/10 mb-4">
        <AlertCircleIcon class="w-8 h-8 text-failed" />
      </div>
      <h2 class="text-xl font-semibold text-zinc-100 mb-2">
        {{ error.statusCode === 404 ? "Profile not found" : "Something went wrong" }}
      </h2>
      <p class="text-sm text-zinc-400 mb-6">
        {{
          error.statusCode === 404
            ? `We couldn't find a profile for "${cleanHandle}". Check the handle and try again.`
            : "There was a problem loading this profile. Please try again later."
        }}
      </p>
      <NuxtLink to="/" class="px-4 py-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"> &larr; Back to home </NuxtLink>
    </div>

    <!-- Profile content -->
    <template v-else-if="profile">
      <ProfileHeader
        :profile="{
          avatar: profile.avatar,
          displayName: profile.displayName || profile.handle,
          handle: profile.handle,
          did: profile.did,
          description: profile.description,
        }"
        :claims="profileClaims"
      >
        <template #actions>
          <button
            class="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-zinc-700/50 transition-all"
            @click="shareProfile"
          >
            <ShareIcon class="w-4 h-4 sm:hidden" />
            <span class="hidden sm:inline">Share</span>
          </button>
        </template>
      </ProfileHeader>

      <!-- Claims list -->
      <div v-if="profile.claims && profile.claims.length > 0" class="mt-8 space-y-3">
        <ClaimCard v-for="claim in profile.claims" :key="claim.uri" :claim="mapClaim(claim)">
          <template #actions>
            <VerifyPopover :claim-uri="claim.uri" :did="profile.did" :display-name="mapClaim(claim).displayName" :provider-name="claim.matches?.[0]?.providerName" :rkey="isOwnProfile ? claim.rkey : undefined" @updated="() => refresh()" />
            <button
              v-if="isOwnProfile"
              class="p-1.5 rounded-lg text-zinc-500 hover:text-failed hover:bg-failed/10 transition-colors"
              title="Delete claim"
              @click.stop="deleteClaim(claim)"
            >
              <Trash2Icon class="w-4 h-4" />
            </button>
          </template>
        </ClaimCard>
      </div>

      <!-- Empty state -->
      <div v-else class="mt-12 text-center py-16 rounded-xl border border-zinc-800/50 bg-kt-surface">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 mb-4">
          <LinkIcon class="w-8 h-8 text-zinc-600" />
        </div>
        <h3 class="text-lg font-semibold text-zinc-200 mb-2">No linked accounts yet</h3>
        <p class="text-sm text-zinc-500 max-w-sm mx-auto">This user hasn't linked any external accounts to their ATProto identity yet.</p>
      </div>

      <!-- Technical details (progressive disclosure) -->
      <details v-if="profile.did" class="mt-8">
        <summary class="text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer transition-colors">Technical details</summary>
        <div class="mt-3 p-4 rounded-lg bg-kt-inset border border-zinc-800 font-mono text-xs text-zinc-500 space-y-1">
          <div>DID: {{ profile.did }}</div>
          <div>Handle: {{ profile.handle }}</div>
          <div v-if="profile.summary">Claims: {{ profile.summary.total }} total, {{ profile.summary.verified }} linked</div>
          <div v-for="claim in profile.claims" :key="claim.uri" class="mt-4 pl-2 border-l border-zinc-700 space-y-0.5">
            <div>type: {{ claim.type }}</div>
            <div>claim: {{ claim.identity?.subject }}</div>
            <div class="break-all">
              proof:
              <a
                :href="`https://pdsls.dev/${claim.uri.replace('at://', 'at/')}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-violet-400 hover:text-violet-300 transition-colors"
              >
                {{ claim.uri }}
              </a>
            </div>
            <div class="break-all">
              record:
              <a
                :href="`https://pdsls.dev/at://${profile.did}/dev.keytrace.claim/${claim.rkey}`"
                target="_blank"
                rel="noopener noreferrer"
                class="text-violet-400 hover:text-violet-300 transition-colors"
              >
                {{ claim.rkey }}
              </a>
            </div>
          </div>
        </div>
      </details>
    </template>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle as AlertCircleIcon, Share2 as ShareIcon, Link as LinkIcon, Trash2 as Trash2Icon } from "lucide-vue-next";

const route = useRoute();
const { session } = useSession();

const rawHandle = computed(() => {
  const param = route.params.handle as string;
  return param;
});

const cleanHandle = computed(() => {
  // Strip leading @ if present
  return rawHandle.value.replace(/^@/, "");
});

const { data: profile, pending, error, refresh } = await useFetch(() => `/api/profile/${encodeURIComponent(cleanHandle.value)}`);

// Check if viewing own profile
const isOwnProfile = computed(() => {
  if (!session.value?.authenticated || !profile.value) return false;
  return session.value.did === profile.value.did;
});

// Map API claims to the shape ProfileHeader expects
const profileClaims = computed(() => (profile.value?.claims ?? []).map((c: any) => ({ status: c.status })));

// Map API claim to ClaimCard data shape
function mapClaim(claim: any) {
  const match = claim.matches?.[0];
  return {
    displayName: match?.providerName ?? guessDisplayName(claim.uri),
    status: claim.status,
    serviceType: claim.type ?? match?.provider ?? guessServiceType(claim.uri),
    subject: claim.uri,
    recipeName: match?.provider,
    comment: claim.comment,
    createdAt: claim.createdAt,
    lastVerifiedAt: claim.lastVerifiedAt,
    failedAt: claim.failedAt,
    identity: claim.identity,
    attestation: undefined,
    recipe: undefined,
  };
}

function guessDisplayName(uri: string) {
  if (uri.includes("github.com")) return "GitHub Account";
  if (uri.startsWith("dns:")) return "Domain";
  if (uri.includes("mastodon")) return "Mastodon Account";
  if (uri.startsWith("pgp:")) return "PGP Key";
  return "Identity Claim";
}

function guessServiceType(uri: string) {
  if (uri.includes("github.com")) return "github";
  if (uri.startsWith("dns:")) return "dns";
  if (uri.includes("mastodon")) return "mastodon";
  if (uri.startsWith("pgp:")) return "pgp";
  return "";
}

function shareProfile() {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title: `${profile.value?.displayName} on Keytrace`, url });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
  }
}

async function deleteClaim(claim: any) {
  if (!claim.rkey) return;

  if (!confirm("Are you sure you want to delete this claim?")) return;

  try {
    await $fetch(`/api/claims/${claim.rkey}`, { method: "DELETE" });
    await refresh();
  } catch {
    // Could add toast notification here
  }
}

// OG meta tags
const ogDisplayName = computed(() => profile.value?.displayName || profile.value?.handle || "Profile");
const ogDescription = computed(() => (profile.value ? `View ${ogDisplayName.value}'s verified identities on Keytrace` : "View verified identities on Keytrace"));

useSeoMeta({
  title: computed(() => `${ogDisplayName.value} - Keytrace`),
  ogTitle: computed(() => `${ogDisplayName.value} on Keytrace`),
  description: ogDescription,
  ogDescription,
  twitterCard: "summary_large_image",
});

defineOgImageComponent("Profile", {
  displayName: computed(() => profile.value?.displayName || ""),
  handle: computed(() => profile.value?.handle || ""),
  avatar: computed(() => profile.value?.avatar || ""),
  verifiedCount: computed(() => profile.value?.summary?.verified || 0),
  claims: computed(() =>
    (profile.value?.claims ?? [])
      .filter((c: any) => c.status === "verified" || c.status === "init")
      .slice(0, 6)
      .map((c: any) => ({
        type: c.type || c.matches?.[0]?.provider || "",
        subject: c.identity?.subject || c.identity?.displayName || "",
      })),
  ),
});
</script>
