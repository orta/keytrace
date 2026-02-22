<template>
  <div class="max-w-2xl mx-auto px-6 py-12">
    <h2 class="text-2xl font-semibold text-zinc-100 tracking-tight">What would you like to link?</h2>
    <p class="mt-2 text-zinc-400 text-sm">Choose an account or service to link to your identity.</p>

    <div class="mt-8">
      <ServicePicker :services="services" @select="selectService" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Github, Globe, AtSign, Cloud, Shield } from "lucide-vue-next";
import NpmIcon from "~/components/icons/NpmIcon.vue";
import TangledIcon from "~/components/icons/TangledIcon.vue";
import type { ServiceOption } from "~/components/ui/ServicePicker.vue";

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
const { data: servicesData } = await useFetch("/api/services");

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
interface ServiceFromAPI {
  id: string;
  name: string;
  homepage: string;
  ui: {
    description: string;
    icon: string;
  };
}

const services = computed<ServiceOption[]>(() => {
  if (!servicesData.value) return [];
  return (servicesData.value as ServiceFromAPI[]).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.ui.description,
    icon: iconMap[s.ui.icon] ?? Globe,
  }));
});

function selectService(service: ServiceOption) {
  navigateTo(`/add/${service.id}`);
}
</script>
