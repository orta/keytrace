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
        top: '-80px',
        left: '-80px',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
      }"
    />
    <div
      :style="{
        position: 'absolute',
        bottom: '-120px',
        right: '-60px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)',
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
      <!-- Top: Keytrace branding -->
      <div class="flex-row" :style="{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }">
        <div
          :style="{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#8B5CF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '16px',
            fontWeight: '700',
          }"
        >
          K
        </div>
        <span :style="{ fontSize: '18px', fontWeight: '600', color: '#71717a' }">keytrace.dev</span>
      </div>

      <!-- Package name -->
      <div :style="{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }">
        <div
          class="flex-row"
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(139,92,246,0.1)',
            border: '1px solid rgba(139,92,246,0.2)',
            alignSelf: 'flex-start',
          }"
        >
          <span :style="{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: '400', color: '#a78bfa' }">@keytrace/claims</span>
        </div>

        <span :style="{ fontSize: '48px', fontWeight: '700', color: '#f4f4f5', lineHeight: '1.15' }"> Verify Keytrace Claims </span>

        <span :style="{ fontSize: '20px', color: '#a1a1aa', lineHeight: '1.4' }">
          Verify identity claims in the browser or Node.js. Zero runtime dependencies.
        </span>
      </div>

      <!-- Install command -->
      <div
        class="flex-row"
        :style="{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: '32px',
          padding: '16px 24px',
          borderRadius: '12px',
          backgroundColor: '#13111c',
          border: '1px solid #27272a',
          alignSelf: 'flex-start',
        }"
      >
        <span :style="{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', color: '#a1a1aa' }">
          <span :style="{ color: '#71717a' }">$</span> npm install @keytrace/claims
        </span>
      </div>

      <!-- Platform badges -->
      <div
        class="flex-row"
        :style="{
          display: 'flex',
          flexDirection: 'row',
          gap: '10px',
          marginTop: 'auto',
          flexWrap: 'wrap',
        }"
      >
        <div
          v-for="platform in platforms"
          :key="platform"
          :style="{
            padding: '8px 14px',
            borderRadius: '8px',
            backgroundColor: '#1c1929',
            border: '1px solid #27272a',
            fontSize: '14px',
            color: '#a1a1aa',
          }"
        >
          {{ platform }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const platforms = ["Node.js 18+", "Modern Browsers", "Deno", "Cloudflare Workers"];
</script>
