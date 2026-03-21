<template>
  <div class="max-w-2xl mx-auto px-4 py-16">
    <h1 class="text-2xl font-bold text-zinc-100 mb-2">Blog</h1>
    <p class="text-sm text-zinc-500 mb-12">Updates and thoughts on Keytrace and identity on the decentralized web.</p>

    <div class="space-y-8">
      <article v-for="post in (posts ?? [])" :key="post.path" class="group">
        <NuxtLink :to="post.path" class="block">
          <time class="text-xs text-zinc-600 font-mono">{{ formatDate(post.date) }}</time>
          <h2 class="text-base font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors mt-1">
            {{ post.title }}
          </h2>
          <p class="text-sm text-zinc-500 mt-1 leading-relaxed">{{ post.description }}</p>
        </NuxtLink>
      </article>
    </div>

    <p v-if="!posts?.length" class="text-sm text-zinc-600">No posts yet.</p>
  </div>
</template>

<script setup lang="ts">
const { data: posts } = await useAsyncData("blog-posts", () =>
  queryCollection("blog").order("date", "DESC").all()
);

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

useSeoMeta({ title: "Blog — Keytrace", description: "Updates and thoughts on Keytrace and identity on the decentralized web." });
</script>
