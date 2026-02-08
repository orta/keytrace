import type { Config } from "tailwindcss"

export default {
  darkMode: "class",
  content: [
    "./components/**/*.{vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./app.vue",
  ],
  theme: {
    extend: {
      colors: {
        kt: {
          brand: "#8B5CF6",
          "brand-hover": "#7C3AED",
          surface: "var(--kt-bg-surface)",
          elevated: "var(--kt-bg-elevated)",
          inset: "var(--kt-bg-inset)",
          root: "var(--kt-bg-root)",
        },
        verified: "#22C55E",
        pending: "#F59E0B",
        failed: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      boxShadow: {
        "glow-brand": "0 0 30px rgba(139, 92, 246, 0.15)",
        "glow-verified": "0 0 20px rgba(34, 197, 94, 0.15)",
        card: "0 1px 3px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)",
      },
    },
  },
} satisfies Config
