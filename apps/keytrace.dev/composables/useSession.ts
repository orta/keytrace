interface Session {
  authenticated: boolean;
  did?: string;
  handle?: string;
  displayName?: string;
  avatar?: string;
  needsReauth?: boolean;
}

const sessionState = ref<Session | null>(null);
const sessionLoading = ref(false);
const sessionFetched = ref(false);

export function useSession() {
  async function fetchSession() {
    if (sessionFetched.value) return;
    sessionLoading.value = true;
    try {
      const data = await $fetch<Session>("/api/oauth/session");
      sessionState.value = data;
    } catch {
      sessionState.value = { authenticated: false };
    } finally {
      sessionLoading.value = false;
      sessionFetched.value = true;
    }
  }

  async function refresh() {
    sessionFetched.value = false;
    await fetchSession();
  }

  async function logout() {
    await $fetch("/api/oauth/logout", { method: "POST" });
    sessionState.value = { authenticated: false };
  }

  function login(handle: string) {
    if (handle) {
      navigateTo(`/oauth/login?handle=${encodeURIComponent(handle)}`, {
        external: true,
      });
    }
  }

  // Auto-fetch on first use
  if (!sessionFetched.value && !sessionLoading.value) {
    fetchSession();
  }

  return {
    session: readonly(sessionState),
    loading: readonly(sessionLoading),
    refresh,
    logout,
    login,
  };
}
