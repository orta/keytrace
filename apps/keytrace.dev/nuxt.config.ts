export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },

  devServer: {
    port: 3000,
  },

  vite: {
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
  },
})
