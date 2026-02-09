const colorMode = ref<"dark" | "light">("dark");

export function useColorMode() {
  function apply(mode: "dark" | "light") {
    colorMode.value = mode;
    if (import.meta.client) {
      localStorage.setItem("kt-theme", mode);
    }
  }

  function toggle() {
    apply(colorMode.value === "dark" ? "light" : "dark");
  }

  function init() {
    if (!import.meta.client) return;
    const stored = localStorage.getItem("kt-theme") as "dark" | "light" | null;
    // Dark-first: only use light if explicitly chosen by the user
    apply(stored ?? "dark");
  }

  return {
    colorMode: readonly(colorMode),
    toggle,
    init,
  };
}
