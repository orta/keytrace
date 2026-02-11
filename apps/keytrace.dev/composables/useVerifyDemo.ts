import type { VerificationResult } from "@keytrace/claims";

type DemoStatus = "idle" | "verifying" | "complete" | "error";

const handle = ref("");
const status = ref<DemoStatus>("idle");
const result = ref<VerificationResult | null>(null);
const error = ref<string | null>(null);

export function useVerifyDemo() {
  async function verify(handleInput: string) {
    if (!handleInput.trim()) {
      error.value = "Please enter a handle or DID";
      status.value = "error";
      return;
    }

    handle.value = handleInput.trim();
    status.value = "verifying";
    error.value = null;
    result.value = null;

    try {
      // Dynamic import for client-side only
      const { getClaimsForHandle } = await import("@keytrace/claims");
      result.value = await getClaimsForHandle(handle.value);
      status.value = "complete";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Verification failed";
      status.value = "error";
    }
  }

  function reset() {
    handle.value = "";
    status.value = "idle";
    result.value = null;
    error.value = null;
  }

  return {
    handle: readonly(handle),
    status: readonly(status),
    result: readonly(result),
    error: readonly(error),
    verify,
    reset,
  };
}
