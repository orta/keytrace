<template>
  <button class="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors" @click="copy">
    <Transition name="fade" mode="out-in">
      <CheckIcon v-if="copied" key="check" class="w-3.5 h-3.5 text-verified" />
      <ClipboardIcon v-else key="copy" class="w-3.5 h-3.5" />
    </Transition>
    <span v-if="copied" class="text-xs text-verified">Copied</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Check as CheckIcon, Clipboard as ClipboardIcon } from "lucide-vue-next";

const props = defineProps<{
  value: string;
}>();

const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Clipboard API may not be available
  }
}
</script>
