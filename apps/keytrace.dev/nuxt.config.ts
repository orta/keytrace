export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },

  modules: ["@nuxtjs/tailwindcss", "@nuxtjs/google-fonts"],

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
    keytraceAppPassword: "",
  },
});
