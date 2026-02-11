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
        top: '-100px',
        right: '-100px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
      }"
    />
    <div
      :style="{
        position: 'absolute',
        bottom: '-80px',
        left: '-80px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
      }"
    />

    <!-- Main content -->
    <div
      :style="{
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        padding: '60px',
        position: 'relative',
      }"
    >
      <!-- Top bar: logo + tagline pill -->
      <div class="flex-row" :style="{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }">
        <div class="flex-row" :style="{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }">
          <div
            :style="{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: '700',
            }"
          >
            K
          </div>
          <span :style="{ fontSize: '22px', fontWeight: '700', color: '#f4f4f5' }">Keytrace</span>
        </div>
        <div
          class="flex-row"
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: '1px solid #27272a',
            backgroundColor: 'rgba(24,24,27,0.5)',
            fontSize: '14px',
            color: '#a1a1aa',
          }"
        >
          <div :style="{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }" />
          Identity verification for ATProto
        </div>
      </div>

      <!-- Headline -->
      <div :style="{ display: 'flex', flexDirection: 'column', marginTop: '48px' }">
        <span :style="{ fontSize: '64px', fontWeight: '700', color: '#f4f4f5', lineHeight: '1.1' }">You be you,</span>
        <span
          :style="{
            fontSize: '64px',
            fontWeight: '700',
            lineHeight: '1.1',
            background: 'linear-gradient(to right, #a78bfa, #34d399)',
            backgroundClip: 'text',
            color: 'transparent',
          }"
        >
          everywhere.
        </span>
      </div>

      <!-- Subtitle -->
      <p :style="{ fontSize: '20px', color: '#a1a1aa', marginTop: '20px', lineHeight: '1.5' }">
        Link your GitHub, domain, and other accounts to your Bluesky identity.
      </p>

      <!-- Recent claims -->
      <div
        v-if="claims && claims.length > 0"
        class="flex-row"
        :style="{
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          marginTop: 'auto',
        }"
      >
        <div
          v-for="(claim, i) in claims.slice(0, 4)"
          :key="i"
          class="flex-row"
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: '#13111c',
            border: '1px solid #27272a',
          }"
        >
          <div :style="{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }" />
          <span :style="{ fontSize: '14px', color: '#a1a1aa' }">{{ claim.handle }}</span>
          <span :style="{ fontSize: '12px', color: '#71717a' }">{{ claim.type }}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div
      :style="{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '0 60px 30px',
        position: 'relative',
      }"
    >
      <span :style="{ fontSize: '16px', color: '#71717a' }">keytrace.dev</span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    claims?: { handle: string; type: string }[];
  }>(),
  {
    claims: () => [],
  },
);
</script>
