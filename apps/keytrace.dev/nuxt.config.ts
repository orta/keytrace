export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },

  modules: ["@nuxtjs/tailwindcss", "@nuxtjs/google-fonts", "nuxt-og-image"],

  ogImage: {
    fonts: [
      "Inter:400",
      "Inter:600",
      "Inter:700",
      "JetBrains+Mono:400",
    ],
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

  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
      "JetBrains+Mono": [400, 500],
    },
    display: "swap",
  },

  devServer: {
    port: 3000,
  },

  vite: {
    resolve: {
      dedupe: ["vue"],
    },
    server: {
      allowedHosts: [".ngrok-free.app"],
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
