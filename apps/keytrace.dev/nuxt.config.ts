export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  srcDir: ".",
  devtools: { enabled: true },

  // Disable inline SSR styles so <head> stays small enough for
  // social-card crawlers (Bluesky cardyb, Twitter, etc.) to reach
  // the og: meta tags. CSS is still loaded via external <link> tags.
  features: {
    inlineStyles: false,
  },

  modules: ["@nuxtjs/tailwindcss", "@nuxt/fonts", "nuxt-og-image", "@nuxt/content"],

  content: {
    highlight: {
      theme: "github-dark",
    },
  },

  site: {
    url: process.env.NUXT_PUBLIC_PUBLIC_URL || "http://localhost:3000",
    name: "Keytrace",
  },

  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],

  css: ["~/assets/css/main.css"],

  fonts: {
    families: [
      { name: "Inter", weights: [400, 500, 600, 700] },
      { name: "JetBrains Mono", weights: [400, 500] },
    ],
    defaults: {
      display: "swap",
    },
  },

  devServer: {
    host: "127.0.0.1",
    port: 3000,
  },

  vite: {
    resolve: {
      dedupe: ["vue"],
    },
    server: {
      allowedHosts: [".ngrok-free.app", ".loca.lt"],
    },
  },

  nitro: {
    storage: {
      data: {
        driver: "fs",
        base: "./.data",
      },
    },
  },

  runtimeConfig: {
    sessionSecret: "dev-secret-change-in-production",
    public: {
      publicUrl: "http://localhost:3000",
    },
    s3Bucket: "",
    s3Region: "fr-par",
    s3AccessKeyId: "",
    s3SecretAccessKey: "",
    s3Endpoint: "",
    keytraceDid: "",
    keytracePassword: "",
  },
});
