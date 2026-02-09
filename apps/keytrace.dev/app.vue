<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { colorMode, init } = useColorMode();

// Set html class during SSR and client to avoid hydration mismatch
useHead({
  htmlAttrs: {
    class: computed(() => colorMode.value),
  },
});

onMounted(() => {
  init();
});
</script>
