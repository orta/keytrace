<script setup lang="ts">
interface Session {
  authenticated: boolean
  did?: string
  handle?: string
  displayName?: string
  avatar?: string
}

const { data: session, refresh } = await useFetch<Session>("/api/oauth/session")
const handle = ref("")

function handleLogin() {
  if (handle.value) {
    navigateTo(`/oauth/login?handle=${encodeURIComponent(handle.value)}`, {
      external: true,
    })
  }
}

async function handleLogout() {
  await $fetch("/api/oauth/logout", { method: "POST" })
  await refresh()
}
</script>

<template>
  <div :style="{ padding: '2rem', fontFamily: 'system-ui' }">
    <h1>keytrace.dev</h1>

    <div v-if="session?.authenticated">
      <div
        :style="{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
        }"
      >
        <img
          v-if="session.avatar"
          :src="session.avatar"
          alt=""
          :style="{ width: '48px', height: '48px', borderRadius: '50%' }"
        />
        <div>
          <div :style="{ fontWeight: 'bold' }">
            {{ session.displayName || session.handle }}
          </div>
          <div :style="{ color: '#666' }">@{{ session.handle }}</div>
          <div :style="{ fontSize: '0.8rem', color: '#999' }">
            {{ session.did }}
          </div>
        </div>
      </div>
      <button @click="handleLogout">Logout</button>
    </div>

    <form v-else @submit.prevent="handleLogin">
      <p>Sign in with your Bluesky handle:</p>
      <input
        v-model="handle"
        type="text"
        placeholder="you.bsky.social"
        :style="{ padding: '0.5rem', marginRight: '0.5rem' }"
      />
      <button type="submit">Login with Bluesky</button>
    </form>
  </div>
</template>
