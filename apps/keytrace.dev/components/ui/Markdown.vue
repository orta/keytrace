<template>
  <span v-html="rendered" />
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  content: string;
}>();

/**
 * Simple markdown renderer for instruction text.
 * Supports: **bold**, `code`, [links](url)
 */
const rendered = computed(() => {
  let html = escapeHtml(props.content);

  // Convert **bold** to <strong>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-zinc-100 font-medium">$1</strong>');

  // Convert `code` to <code>
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-zinc-800 text-violet-400 text-xs font-mono">$1</code>');

  // Convert [text](url) to <a>
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-violet-400 hover:text-violet-300 underline underline-offset-2">$1</a>',
  );

  return html;
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
</script>
