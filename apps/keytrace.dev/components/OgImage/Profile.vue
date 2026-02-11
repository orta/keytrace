<template>
  <div
    :style="{
      display: 'flex',
      flexDirection: 'column',
      width: '1200px',
      height: '630px',
      backgroundColor: '#0c0a13',
      fontFamily: 'Inter, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }"
  >
    <!-- Gradient accents -->
    <div
      :style="{
        position: 'absolute',
        top: '-120px',
        right: '-80px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
      }"
    />
    <div
      :style="{
        position: 'absolute',
        bottom: '-100px',
        left: '-60px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)',
      }"
    />

    <!-- Main content: claims front and center -->
    <div
      :style="{
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        padding: '50px 60px',
        position: 'relative',
      }"
    >
      <!-- Top: Keytrace branding + verified count -->
      <div class="flex-row" :style="{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }">
        <div class="flex-row" :style="{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '14px' }">
          <div
            :style="{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              fontWeight: '700',
            }"
          >
            K
          </div>
          <span :style="{ fontSize: '24px', fontWeight: '600', color: '#71717a' }">keytrace.dev</span>
        </div>
        <div
          v-if="verifiedCount > 0"
          class="flex-row"
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 20px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
          }"
        >
          <div :style="{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }" />
          <span :style="{ fontSize: '20px', fontWeight: '600', color: '#4ade80' }">{{ verifiedCount }} verified</span>
        </div>
      </div>

      <!-- Heading -->
      <span :style="{ fontSize: '40px', fontWeight: '700', color: '#f4f4f5', marginTop: '40px' }">
        Verified Identities
      </span>

      <!-- Claims grid -->
      <div
        v-if="claims && claims.length > 0"
        class="flex-row"
        :style="{
          display: 'flex',
          flexDirection: 'row',
          gap: '16px',
          marginTop: '28px',
          flexWrap: 'wrap',
        }"
      >
        <div
          v-for="(claim, i) in claims.slice(0, 6)"
          :key="i"
          class="flex-row"
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            borderRadius: '14px',
            backgroundColor: '#13111c',
            border: '1px solid #27272a',
          }"
        >
          <div :style="{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }" />
          <span :style="{ fontSize: '24px', fontWeight: '600', color: '#f4f4f5' }">{{ formatType(claim.type) }}</span>
          <span v-if="claim.subject" :style="{ fontSize: '22px', color: '#a1a1aa' }">{{ truncate(claim.subject, 28) }}</span>
        </div>
      </div>
    </div>

    <!-- Footer: avatar + name -->
    <div
      class="flex-row"
      :style="{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '18px',
        padding: '24px 60px 36px',
        borderTop: '1px solid #1c1c22',
        position: 'relative',
      }"
    >
      <img
        v-if="avatar"
        :src="avatar"
        :style="{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: '2px solid #27272a',
        }"
      />
      <div
        v-else
        :style="{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#1c1929',
          border: '2px solid #27272a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#71717a',
          fontSize: '24px',
          fontWeight: '700',
        }"
      >
        {{ (displayName || handle || '?')[0].toUpperCase() }}
      </div>
      <div class="flex-col" :style="{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }">
        <span :style="{ fontSize: '26px', fontWeight: '700', color: '#f4f4f5', lineHeight: '1.2' }">
          {{ displayName || handle }}
        </span>
        <span :style="{ fontSize: '20px', color: '#71717a', marginTop: '2px' }">@{{ handle }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    displayName?: string;
    handle?: string;
    avatar?: string;
    verifiedCount?: number;
    claims?: { type: string; subject?: string }[];
  }>(),
  {
    displayName: "",
    handle: "",
    avatar: "",
    verifiedCount: 0,
    claims: () => [],
  },
);

function formatType(type: string) {
  const names: Record<string, string> = {
    github: "GitHub",
    dns: "DNS",
    mastodon: "Mastodon",
    fediverse: "Fediverse",
    npm: "npm",
    bluesky: "Bluesky",
  };
  return names[type] || type;
}

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}
</script>
