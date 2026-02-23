<template>
  <div class="relative" @mouseenter="showPopover" @mouseleave="hidePopoverDelayed">
    <!-- Trigger button -->
    <button
      class="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
      title="Re-verify claim"
      :disabled="isRunning"
      @click.stop="runVerification"
    >
      <RefreshCwIcon class="w-4 h-4" :class="{ 'animate-spin': isRunning }" />
    </button>

    <!-- Popover -->
    <Transition name="popover">
      <div
        v-if="isVisible"
        class="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50"
        @mouseenter="cancelHide"
        @mouseleave="hidePopoverDelayed"
      >
        <div class="bg-kt-elevated border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="px-4 py-3 border-b border-zinc-800">
            <h3 class="text-sm font-semibold text-zinc-200">
              {{ isRunning ? 'Verifying...' : result ? 'Verification Result' : 'Re-verify Claim' }}
            </h3>
            <p class="text-xs text-zinc-500 mt-0.5 truncate">{{ displayName }}</p>
          </div>

          <!-- Content -->
          <div class="p-4">
            <VerificationLog :steps="steps" />

            <!-- Result message -->
            <div v-if="result" class="mt-3">
              <div
                v-if="result.status === 'verified'"
                class="flex items-center gap-2 px-3 py-2 rounded-lg bg-verified/10 border border-verified/20"
              >
                <CheckCircleIcon class="w-4 h-4 text-verified flex-shrink-0" />
                <span class="text-xs text-verified font-medium">Verified successfully</span>
              </div>
              <div
                v-else
                class="px-3 py-2 rounded-lg bg-failed/10 border border-failed/20"
              >
                <div class="flex items-center gap-2">
                  <XCircleIcon class="w-4 h-4 text-failed flex-shrink-0" />
                  <span class="text-xs text-failed font-medium">Verification failed</span>
                </div>
                <p v-if="result.errors.length" class="text-xs text-zinc-500 mt-1 pl-6">
                  {{ result.errors[0] }}
                </p>
              </div>
            </div>

            <!-- Action hint when not running -->
            <p v-if="!isRunning && !result" class="text-xs text-zinc-600 mt-3 text-center">
              Click to run verification
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { RefreshCw as RefreshCwIcon, CheckCircle as CheckCircleIcon, XCircle as XCircleIcon } from "lucide-vue-next";
import type { VerificationStep, ExpandableContent } from "./VerificationLog.vue";

const props = defineProps<{
  claimUri: string;
  did: string;
  displayName: string;
  providerName?: string;
  /** When provided, also calls PATCH to update the record's status sig after verification */
  rkey?: string;
}>();

const emit = defineEmits<{
  verified: [];
  updated: [status: string];
}>();

const isVisible = ref(false);
const isRunning = ref(false);
const hideTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

const steps = ref<VerificationStep[]>([
  { action: "Matching service provider", status: "pending" },
  { action: "Fetching proof", status: "pending" },
  { action: "Checking for DID", status: "pending" },
]);

const result = ref<{ status: "verified" | "failed"; errors: string[] } | null>(null);

function showPopover() {
  cancelHide();
  isVisible.value = true;
}

function hidePopoverDelayed() {
  hideTimeout.value = setTimeout(() => {
    // Don't hide while running
    if (!isRunning.value) {
      isVisible.value = false;
      // Reset state when hiding
      resetState();
    }
  }, 200);
}

function cancelHide() {
  if (hideTimeout.value) {
    clearTimeout(hideTimeout.value);
    hideTimeout.value = null;
  }
}

function resetState() {
  steps.value = [
    { action: "Matching service provider", status: "pending" },
    { action: "Fetching proof", status: "pending" },
    { action: "Checking for DID", status: "pending" },
  ];
  result.value = null;
}

async function runVerification() {
  if (isRunning.value) return;

  isRunning.value = true;
  isVisible.value = true;
  cancelHide();
  resetState();

  try {
    // Step 1: Matching
    steps.value[0] = { ...steps.value[0], status: "running" };
    await new Promise((r) => setTimeout(r, 300));
    steps.value[0] = {
      ...steps.value[0],
      status: "success",
      detail: props.providerName || "Matched",
    };

    // Step 2: Fetching proof
    steps.value[1] = { ...steps.value[1], status: "running" };
    const step2Start = Date.now();

    const apiResult = await $fetch("/api/verify", {
      method: "POST",
      body: {
        claimUri: props.claimUri,
        did: props.did,
      },
    });

    // Build expandable content for the fetch step
    const fetchExpandable: ExpandableContent | undefined = apiResult.proofDetails
      ? {
          url: apiResult.proofDetails.fetchUrl,
          fetcher: apiResult.proofDetails.fetcher,
          content: apiResult.proofDetails.content,
        }
      : undefined;

    steps.value[1] = {
      ...steps.value[1],
      status: "success",
      detail: "Proof retrieved",
      duration: Date.now() - step2Start,
      expandable: fetchExpandable,
    };

    // Step 3: Checking for DID
    steps.value[2] = { ...steps.value[2], status: "running" };
    const step3Start = Date.now();
    await new Promise((r) => setTimeout(r, 200));

    // Build expandable content for the verification step
    const verifyExpandable: ExpandableContent | undefined = apiResult.proofDetails
      ? {
          targets: apiResult.proofDetails.targets,
          patterns: apiResult.proofDetails.patterns,
        }
      : undefined;

    if (apiResult.status === "verified") {
      steps.value[2] = {
        ...steps.value[2],
        status: "success",
        detail: "DID found in proof",
        duration: Date.now() - step3Start,
        expandable: verifyExpandable,
      };
      result.value = { status: "verified", errors: [] };
      emit("verified");
    } else {
      steps.value[2] = {
        ...steps.value[2],
        status: "error",
        detail: "DID not found",
        duration: Date.now() - step3Start,
        expandable: verifyExpandable,
      };
      result.value = { status: "failed", errors: apiResult.errors || [] };
    }

    // If rkey is provided, persist the result by updating the record's status sig
    if (props.rkey) {
      steps.value.push({ action: "Updating record", status: "running" });
      try {
        const patchResult = await $fetch(`/api/claims/${props.rkey}`, {
          method: "PATCH",
          body: { action: apiResult.status === "verified" ? "reverify" : "retract" },
        });
        steps.value[steps.value.length - 1] = {
          ...steps.value[steps.value.length - 1],
          status: "success",
          detail: `Status: ${(patchResult as any).status}`,
        };
        emit("updated", (patchResult as any).status);
      } catch {
        steps.value[steps.value.length - 1] = {
          ...steps.value[steps.value.length - 1],
          status: "error",
          detail: "Failed to update record",
        };
      }
    }
  } catch (err) {
    steps.value[1] = { ...steps.value[1], status: "error" };
    steps.value[2] = { ...steps.value[2], status: "error" };
    result.value = {
      status: "failed",
      errors: [err instanceof Error ? err.message : "Verification failed"],
    };
  } finally {
    isRunning.value = false;
  }
}
</script>

<style scoped>
.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
