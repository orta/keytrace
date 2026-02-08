<template>
  <div>
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-zinc-300 mb-2">
      {{ label }}
    </label>
    <input
      :id="inputId"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      class="w-full px-4 py-2.5 rounded-lg bg-kt-inset border border-zinc-800 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
import { useId } from "vue"

defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  type?: string
}>()

defineEmits<{
  "update:modelValue": [value: string]
}>()

const inputId = useId()
</script>
