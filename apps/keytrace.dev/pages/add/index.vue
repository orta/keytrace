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
import type { ServiceOption } from "~/components/ui/ServicePicker.vue";

const { session } = useSession();
const { services: servicesData, iconMap } = useServiceRegistry();

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

const services = computed<ServiceOption[]>(() => {
  if (!servicesData.value) return [];
  return servicesData.value.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.ui.description,
    icon: iconMap[s.ui.icon] ?? iconMap.globe,
  }));
});

function selectService(service: ServiceOption) {
  navigateTo(`/add/${service.id}`);
}
</script>
