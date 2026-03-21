<template>
  <div class="max-w-2xl mx-auto px-4 py-16">
    <NuxtLink to="/blog" class="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-10">
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      Blog
    </NuxtLink>

    <article v-if="post">
      <header class="mb-10">
        <time class="text-xs text-zinc-600 font-mono">{{ formatDate(post.date) }}</time>
        <h1 class="text-2xl font-bold text-zinc-100 mt-2">{{ post.title }}</h1>
        <p class="text-sm text-zinc-500 mt-2 leading-relaxed">{{ post.description }}</p>
      </header>

      <div class="prose prose-invert prose-sm max-w-none
        prose-headings:text-zinc-200 prose-headings:font-semibold
        prose-p:text-zinc-400 prose-p:leading-relaxed
        prose-a:text-violet-400 prose-a:no-underline hover:prose-a:text-violet-300
        prose-strong:text-zinc-300
        prose-code:text-violet-300 prose-code:bg-zinc-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
        prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800
        prose-li:text-zinc-400
        prose-hr:border-zinc-800">
        <ContentRenderer :value="post" />
      </div>
    </article>

    <p v-else class="text-sm text-zinc-600">Post not found.</p>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { data: post } = await useAsyncData(`blog-${route.path}`, () =>
  queryCollection("blog").path(route.path).first()
);

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: "Post not found" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

useSeoMeta({
  title: post.value ? `${post.value.title} — Keytrace Blog` : "Post not found",
  description: post.value?.description,
});
</script>
