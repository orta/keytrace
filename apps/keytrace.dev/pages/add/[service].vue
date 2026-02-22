<template>
  <div class="max-w-2xl mx-auto px-6 py-12">
    <!-- Invalid service -->
    <div v-if="!selectedService && !loading" class="text-center py-12">
      <h2 class="text-2xl font-semibold text-zinc-100">Service not found</h2>
      <p class="mt-2 text-zinc-400 text-sm">The service "{{ serviceId }}" is not available.</p>
      <NuxtLink to="/add" class="mt-6 inline-block px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all">
        Choose a service
      </NuxtLink>
    </div>

    <!-- Valid service flow -->
    <template v-else-if="selectedService">
      <!-- Progress indicator -->
      <WizardProgress :steps="stepLabels" :current-step="currentStep" class="mb-10" />

      <Transition name="slide" mode="out-in">
        <!-- Step 1: Instructions + Proof -->
        <div v-if="currentStep === 0" key="step-0">
          <h2 class="text-2xl font-semibold text-zinc-100 tracking-tight">Create your proof</h2>

          <ol class="mt-6 space-y-4">
            <li v-for="(instruction, i) in selectedInstructions" :key="i" class="flex gap-3">
              <span class="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 text-xs flex items-center justify-center font-mono">
                {{ i + 1 }}
              </span>
              <span class="text-sm text-zinc-300 pt-0.5">
                <Markdown :content="instruction" />
              </span>
            </li>
          </ol>

          <!-- Extra inputs (e.g. PGP fingerprint) — shown before proof so values are substituted -->
          <div v-if="selectedService?.extraInputs" class="mt-6 space-y-4">
            <div v-for="input in selectedService.extraInputs" :key="input.key">
              <KtInput v-model="extraInputValues[input.key]" :label="input.label" :placeholder="input.placeholder" />
              <p v-if="extraInputErrors[input.key]" class="mt-1.5 text-xs text-failed">
                {{ extraInputErrors[input.key] }}
              </p>
            </div>
          </div>

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
            <NuxtLink to="/add" class="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">&larr; Back</NuxtLink>
            <button
              class="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-glow-brand disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!claimUri"
              @click="startVerification"
            >
              Verify
            </button>
          </div>
        </div>

        <!-- Step 2: Verification -->
        <div v-else-if="currentStep === 1" key="step-1">
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
              <NuxtLink :to="`/@${session?.handle}`" class="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all">
                View Your Profile
              </NuxtLink>
              <NuxtLink to="/add" class="px-5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Add another</NuxtLink>
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
              <button class="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-all" @click="currentStep = 0">Try again</button>
              <NuxtLink to="/add" class="px-5 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Start over</NuxtLink>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Github, Globe, AtSign, Cloud, Shield, CheckCircle as CheckCircleIcon, XCircle as XCircleIcon } from "lucide-vue-next";
import NpmIcon from "~/components/icons/NpmIcon.vue";
import TangledIcon from "~/components/icons/TangledIcon.vue";
import type { ServiceOption } from "~/components/ui/ServicePicker.vue";
import type { VerificationStep, ExpandableContent } from "~/components/ui/VerificationLog.vue";
import type { ProofDetails } from "@keytrace/runner";

const route = useRoute();
const serviceId = computed(() => route.params.service as string);

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

// Fetch services from API
const { data: servicesData, pending: loading } = await useFetch("/api/services");

// Map icon names to components
const iconMap: Record<string, unknown> = {
  github: Github,
  globe: Globe,
  "at-sign": AtSign,
  cloud: Cloud,
  npm: NpmIcon,
  tangled: TangledIcon,
  shield: Shield,
};

// Transform API response into ServiceOption format
interface ExtraInputFromAPI {
  key: string;
  label: string;
  placeholder: string;
  pattern?: string;
  patternError?: string;
}

interface ServiceFromAPI {
  id: string;
  name: string;
  homepage: string;
  ui: {
    description: string;
    icon: string;
    inputLabel: string;
    inputPlaceholder: string;
    inputDefaultTemplate?: string;
    instructions: string[];
    proofTemplate: string;
    extraInputs?: ExtraInputFromAPI[];
  };
}

interface ServiceWithUI extends ServiceOption {
  inputLabel: string;
  inputPlaceholder: string;
  inputDefaultTemplate?: string;
  instructions: string[];
  proofTemplate: string;
  extraInputs?: ExtraInputFromAPI[];
}

const services = computed<ServiceWithUI[]>(() => {
  if (!servicesData.value) return [];
  return (servicesData.value as ServiceFromAPI[]).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.ui.description,
    icon: iconMap[s.ui.icon] ?? Globe,
    inputLabel: s.ui.inputLabel,
    inputPlaceholder: s.ui.inputPlaceholder,
    inputDefaultTemplate: s.ui.inputDefaultTemplate,
    instructions: s.ui.instructions,
    proofTemplate: s.ui.proofTemplate,
    extraInputs: s.ui.extraInputs,
  }));
});

// Auto-select service based on route param
const selectedService = computed(() => services.value.find((s) => s.id === serviceId.value) ?? null);

const currentStep = ref(0);
const claimUri = ref("");
const claimUriError = ref("");
// Generate a stable claim ID for this session
const claimId = ref(crypto.randomUUID());

// Extra input values (e.g. PGP fingerprint)
const extraInputValues = ref<Record<string, string>>({});
const extraInputErrors = ref<Record<string, string>>({});

// Two-step flow for direct service pages
const stepLabels = ["Create proof", "Verify"];

// Pre-fill claim URI when service is available
watch(
  selectedService,
  (service) => {
    if (service?.inputDefaultTemplate) {
      const handle = session.value?.handle ?? "handle";
      const slugHandle = handle.replace(/\./g, "-").toLowerCase();
      claimUri.value = service.inputDefaultTemplate
        .replace(/\{did\}/g, session.value?.did ?? "")
        .replace(/\{handle\}/g, handle)
        .replace(/\{slugHandle\}/g, slugHandle);
    }
  },
  { immediate: true },
);

const proofContent = computed(() => {
  const template = selectedService.value?.proofTemplate ?? "";
  const handle = session.value?.handle ?? "handle";
  const slugHandle = handle.replace(/\./g, "-").toLowerCase();
  let result = template
    .replace(/\{did\}/g, session.value?.did ?? "did:plc:...")
    .replace(/\{handle\}/g, handle)
    .replace(/\{slugHandle\}/g, slugHandle)
    .replace(/\{claimId\}/g, claimId.value);
  // Replace extra input placeholders
  for (const [key, value] of Object.entries(extraInputValues.value)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value || `{${key}}`);
  }
  return result;
});

const selectedInstructions = computed(() => selectedService.value?.instructions ?? []);

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
  currentStep.value = 1;
  verificationComplete.value = false;
  verificationSuccess.value = false;
  verificationError.value = "";

  // Validate extra inputs
  if (selectedService.value?.extraInputs) {
    let hasErrors = false;
    for (const input of selectedService.value.extraInputs) {
      const value = extraInputValues.value[input.key] ?? "";
      if (!value) {
        extraInputErrors.value[input.key] = `${input.label} is required`;
        hasErrors = true;
      } else if (input.pattern && !new RegExp(input.pattern).test(value)) {
        extraInputErrors.value[input.key] = input.patternError ?? `Invalid ${input.label}`;
        hasErrors = true;
      } else {
        extraInputErrors.value[input.key] = "";
      }
    }
    if (hasErrors) return;
  }

  // Build the claim URI for the API
  let apiClaimUri = claimUri.value;
  if (selectedService.value?.id === "dns") {
    // For DNS, convert domain to dns: URI format
    apiClaimUri = `dns:${claimUri.value.replace(/^(https?:\/\/)?/, "").replace(/\/.*$/, "")}`;
  } else if (selectedService.value?.id === "pgp") {
    // For PGP, prefix URL with pgp:
    apiClaimUri = `pgp:${claimUri.value}`;
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

    // Build expandable content for the fetch step
    const fetchExpandable: ExpandableContent | undefined = result.proofDetails
      ? {
          url: result.proofDetails.fetchUrl,
          fetcher: result.proofDetails.fetcher,
          content: result.proofDetails.content,
        }
      : undefined;

    verificationSteps.value[1] = {
      ...verificationSteps.value[1],
      status: "success",
      detail: "Proof content retrieved",
      duration: Date.now() - step2Start,
      expandable: fetchExpandable,
    };

    // Step 3: Check result
    verificationSteps.value[2] = { ...verificationSteps.value[2], status: "running" };
    const step3Start = Date.now();
    await new Promise((r) => setTimeout(r, 300));

    // Build expandable content for the verification step
    const verifyExpandable: ExpandableContent | undefined = result.proofDetails
      ? {
          targets: result.proofDetails.targets,
          patterns: result.proofDetails.patterns,
        }
      : undefined;

    if (result.status === "verified") {
      verificationSteps.value[2] = {
        ...verificationSteps.value[2],
        status: "success",
        detail: "Identity confirmed",
        duration: Date.now() - step3Start,
        expandable: verifyExpandable,
      };
    } else {
      verificationSteps.value[2] = {
        ...verificationSteps.value[2],
        status: "error",
        detail: result.errors?.join(", ") || "Proof not found",
        duration: Date.now() - step3Start,
        expandable: verifyExpandable,
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
</script>
