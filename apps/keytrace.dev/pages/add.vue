<template>
  <div class="max-w-2xl mx-auto px-6 py-12">
    <!-- Progress indicator -->
    <WizardProgress :steps="stepLabels" :current-step="currentStep" class="mb-10" />

    <!-- Step 1: Choose Service -->
    <Transition name="slide" mode="out-in">
      <div v-if="currentStep === 0" key="step-0">
        <h2 class="text-2xl font-semibold text-zinc-100 tracking-tight">What would you like to link?</h2>
        <p class="mt-2 text-zinc-400 text-sm">Choose an account or service to link to your identity.</p>

        <div class="mt-8">
          <ServicePicker :services="services" @select="selectService" />
        </div>
      </div>

      <!-- Step 2: Instructions + Proof -->
      <div v-else-if="currentStep === 1" key="step-1">
        <h2 class="text-2xl font-semibold text-zinc-100 tracking-tight">Create your proof</h2>

        <ol class="mt-6 space-y-4">
          <li v-for="(instruction, i) in selectedInstructions" :key="i" class="flex gap-3">
            <span class="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center font-mono">
              {{ i + 1 }}
            </span>
            <span class="text-sm text-zinc-300 pt-0.5">{{ instruction }}</span>
          </li>
        </ol>

        <!-- Proof content to copy -->
        <div class="mt-6 relative">
          <div class="rounded-lg bg-kt-inset border border-zinc-800 p-4 font-mono text-sm text-emerald-400 whitespace-pre-wrap break-all">{{ proofContent }}</div>
          <div class="absolute top-3 right-3">
            <CopyButton :value="proofContent" />
          </div>
        </div>

        <!-- Claim URI input -->
        <div class="mt-6">
          <KtInput v-model="claimUri" :label="selectedService?.inputLabel ?? 'Claim URL'" :placeholder="selectedService?.inputPlaceholder ?? 'https://...'" />
          <p v-if="claimUriError" class="mt-1.5 text-xs text-failed">
            {{ claimUriError }}
          </p>
        </div>

        <div class="mt-8 flex items-center gap-3">
          <button class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors" @click="currentStep = 0">&larr; Back</button>
          <button
            class="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!claimUri"
            @click="startVerification"
          >
            Verify
          </button>
        </div>
      </div>

      <!-- Step 3: Verification -->
      <div v-else-if="currentStep === 2" key="step-2">
        <h2 class="text-2xl font-semibold text-zinc-100 tracking-tight mb-6">Verifying your claim</h2>

        <VerificationLog :steps="verificationSteps" />

        <!-- Success state -->
        <div v-if="verificationComplete && verificationSuccess" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-verified/10 mb-4 animate-verify-ring">
            <CheckCircleIcon class="w-8 h-8 text-verified animate-verify-check" />
          </div>
          <h3 class="text-xl font-semibold text-zinc-100">Claim linked</h3>
          <p class="text-sm text-zinc-400 mt-2">Your identity proof has been verified and stored in your ATProto repo.</p>
          <div class="mt-6 flex items-center justify-center gap-3">
            <NuxtLink to="/dashboard" class="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all"> Go to Dashboard </NuxtLink>
            <button class="px-5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors" @click="reset">Add another</button>
          </div>
        </div>

        <!-- Failure state -->
        <div v-else-if="verificationComplete && !verificationSuccess" class="text-center py-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-failed/10 mb-4">
            <XCircleIcon class="w-8 h-8 text-failed" />
          </div>
          <h3 class="text-xl font-semibold text-zinc-100">Verification failed</h3>
          <p class="text-sm text-zinc-400 mt-2 max-w-sm mx-auto">
            {{ verificationError || "We could not verify your proof. Please check your setup and try again." }}
          </p>
          <div class="mt-6 flex items-center justify-center gap-3">
            <button class="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all" @click="currentStep = 1">Try again</button>
            <button class="px-5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors" @click="reset">Start over</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { Github, Globe, CheckCircle as CheckCircleIcon, XCircle as XCircleIcon } from "lucide-vue-next";
import type { ServiceOption } from "~/components/ui/ServicePicker.vue";
import type { VerificationStep } from "~/components/ui/VerificationLog.vue";

const { session } = useSession();

// Redirect to home if not authenticated
watch(
  () => session.value,
  (s) => {
    if (s && !s.authenticated) {
      navigateTo("/");
    }
  },
  { immediate: true },
);

const currentStep = ref(0);
const selectedService = ref<(ServiceOption & { inputLabel?: string; inputPlaceholder?: string; instructions?: string[]; proofTemplate?: string }) | null>(null);
const claimUri = ref("");
const claimUriError = ref("");
const claimId = ref("");

const stepLabels = ["Choose service", "Create proof", "Verify"];

const services: (ServiceOption & { inputLabel: string; inputPlaceholder: string; instructions: string[]; proofTemplate: string })[] = [
  {
    id: "github-gist",
    name: "GitHub",
    description: "Link via a public gist",
    icon: Github,
    inputLabel: "Gist URL",
    inputPlaceholder: "https://gist.github.com/username/abc123...",
    instructions: [
      "Go to https://gist.github.com",
      "Create a new public gist",
      "Name the file keytrace.json",
      "Paste the verification content below into the file",
      "Save the gist and paste the URL below",
    ],
    proofTemplate: '{\n  "keytrace": "{claimId}",\n  "did": "{did}"\n}',
  },
  {
    id: "dns-txt",
    name: "Domain",
    description: "Link via DNS TXT record",
    icon: Globe,
    inputLabel: "Domain",
    inputPlaceholder: "example.com",
    instructions: [
      "Open your domain's DNS settings",
      "Add a new TXT record to the root domain",
      "Set the value to the verification content below",
      "Wait for DNS propagation (may take a few minutes)",
      "Enter your domain below and verify",
    ],
    proofTemplate: "keytrace-did={did}",
  },
];

const proofContent = computed(() => {
  const template = selectedService.value?.proofTemplate ?? "";
  return template.replace(/\{claimId\}/g, claimId.value).replace(/\{did\}/g, session.value?.did ?? "did:plc:...");
});

const selectedInstructions = computed(() => selectedService.value?.instructions ?? []);

function generateClaimId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return "kt-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function selectService(service: ServiceOption) {
  selectedService.value = services.find((s) => s.id === service.id) ?? null;
  claimUri.value = "";
  claimUriError.value = "";
  claimId.value = generateClaimId();
  currentStep.value = 1;
}

// Verification state
const verificationSteps = ref<VerificationStep[]>([]);
const verificationComplete = ref(false);
const verificationSuccess = ref(false);
const verificationError = ref("");

async function startVerification() {
  if (!claimUri.value) {
    claimUriError.value = "Please enter a URL or domain";
    return;
  }
  claimUriError.value = "";
  currentStep.value = 2;
  verificationComplete.value = false;
  verificationSuccess.value = false;
  verificationError.value = "";

  // Build the claim URI for the API
  let apiClaimUri = claimUri.value;
  if (selectedService.value?.id === "dns-txt") {
    apiClaimUri = `dns:${claimUri.value.replace(/^(https?:\/\/)?/, "").replace(/\/.*$/, "")}`;
  }

  // Set up verification steps
  verificationSteps.value = [
    { action: "Resolving claim target", status: "running" },
    { action: "Fetching proof content", status: "pending" },
    { action: "Verifying identity match", status: "pending" },
    { action: "Creating claim record", status: "pending" },
  ];

  try {
    // Step 1: Resolve
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 500));
    verificationSteps.value[0] = {
      ...verificationSteps.value[0],
      status: "success",
      detail: apiClaimUri,
      duration: Date.now() - startTime,
    };

    // Step 2: Verify via API
    verificationSteps.value[1] = { ...verificationSteps.value[1], status: "running" };
    const step2Start = Date.now();

    const result = await $fetch("/api/verify", {
      method: "POST",
      body: {
        claimUri: apiClaimUri,
        did: session.value?.did,
      },
    });

    verificationSteps.value[1] = {
      ...verificationSteps.value[1],
      status: "success",
      detail: "Proof content retrieved",
      duration: Date.now() - step2Start,
    };

    // Step 3: Check result
    verificationSteps.value[2] = { ...verificationSteps.value[2], status: "running" };
    const step3Start = Date.now();
    await new Promise((r) => setTimeout(r, 300));

    if (result.status === "verified") {
      verificationSteps.value[2] = {
        ...verificationSteps.value[2],
        status: "success",
        detail: "Identity confirmed",
        duration: Date.now() - step3Start,
      };
    } else {
      verificationSteps.value[2] = {
        ...verificationSteps.value[2],
        status: "error",
        detail: result.errors?.join(", ") || "Proof not found",
        duration: Date.now() - step3Start,
      };
      verificationComplete.value = true;
      verificationSuccess.value = false;
      verificationError.value = "Could not find your identity proof. Make sure you followed the instructions correctly.";
      return;
    }

    // Step 4: Create claim record
    verificationSteps.value[3] = { ...verificationSteps.value[3], status: "running" };
    const step4Start = Date.now();

    await $fetch("/api/claims", {
      method: "POST",
      body: { claimUri: apiClaimUri },
    });

    verificationSteps.value[3] = {
      ...verificationSteps.value[3],
      status: "success",
      detail: "Record stored in your ATProto repo",
      duration: Date.now() - step4Start,
    };

    verificationComplete.value = true;
    verificationSuccess.value = true;
  } catch (err: any) {
    // Mark current running step as error
    const runningIdx = verificationSteps.value.findIndex((s) => s.status === "running");
    if (runningIdx >= 0) {
      verificationSteps.value[runningIdx] = {
        ...verificationSteps.value[runningIdx],
        status: "error",
        detail: err?.data?.statusMessage || "Request failed",
      };
    }
    verificationComplete.value = true;
    verificationSuccess.value = false;
    verificationError.value = err?.data?.statusMessage || "Verification failed. Please try again.";
  }
}

function reset() {
  currentStep.value = 0;
  selectedService.value = null;
  claimUri.value = "";
  claimUriError.value = "";
  claimId.value = "";
  verificationSteps.value = [];
  verificationComplete.value = false;
  verificationSuccess.value = false;
  verificationError.value = "";
}
</script>
