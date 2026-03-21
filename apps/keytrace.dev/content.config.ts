import { defineContentConfig, defineCollection, z } from "@nuxt/content";

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: "page",
      source: "blog/**/*.md",
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        author: z.string().optional(),
      }),
    }),
  },
});
