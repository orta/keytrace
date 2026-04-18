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
        top: '-150px',
        right: '-150px',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
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
        background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)',
      }"
    />

    <!-- Two-column layout -->
    <div
      class="flex-row"
      :style="{ display: 'flex', flexDirection: 'row', flex: '1', position: 'relative' }"
    >
      <!-- Left column: profile -->
      <div
        :style="{
          display: 'flex',
          flexDirection: 'column',
          width: '480px',
          padding: '60px',
          justifyContent: 'center',
          gap: '0px',
        }"
      >
        <!-- Avatar -->
        <img
          v-if="avatar"
          :src="avatar"
          width="96"
          height="96"
          :style="{ width: '96px', height: '96px', borderRadius: '50%', border: '3px solid #27272a', marginBottom: '24px' }"
        />
        <div
          v-else
          :style="{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            backgroundColor: '#1c1929',
            border: '3px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8b5cf6',
            fontSize: '40px',
            fontWeight: '700',
            marginBottom: '24px',
          }"
        >
          {{ (displayName || handle || '?')[0].toUpperCase() }}
        </div>

        <!-- Name + handle -->
        <span :style="{ fontSize: '52px', fontWeight: '700', color: '#f4f4f5', lineHeight: '1.05' }">{{ displayName || handle }}</span>
        <span :style="{ fontSize: '26px', color: '#52525b', marginTop: '8px' }">@{{ handle }}</span>

        <!-- Verified count badge -->
        <div
          v-if="verifiedCount > 0"
          class="flex-row"
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            marginTop: '28px',
          }"
        >
          <div :style="{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }" />
          <span :style="{ fontSize: '20px', color: '#4ade80', fontWeight: '600' }">{{ verifiedCount }} verified {{ verifiedCount === 1 ? 'identity' : 'identities' }}</span>
        </div>

        <!-- keytrace.dev label -->
        <span :style="{ fontSize: '14px', color: '#3f3f46', marginTop: 'auto', paddingTop: '32px' }">keytrace.dev</span>
      </div>

      <!-- Column divider -->
      <div :style="{ width: '1px', backgroundColor: '#27272a', alignSelf: 'stretch', margin: '48px 0' }" />

      <!-- Right column: claims -->
      <div
        :style="{
          display: 'flex',
          flexDirection: 'column',
          flex: '1',
          padding: '52px 52px',
          justifyContent: 'center',
        }"
      >
        <span
          :style="{
            fontSize: '13px',
            fontWeight: '600',
            color: '#52525b',
            marginBottom: '18px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }"
        >Verified Claims</span>

        <div :style="{ display: 'flex', flexDirection: 'column', gap: '10px' }">
          <div
            v-for="(claim, i) in claims.slice(0, 5)"
            :key="i"
            class="flex-row"
            :style="{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '16px',
              paddingTop: '8px',
              paddingBottom: '8px',
            }"
          >
            <!-- Service icon -->
            <div
              class="flex-row"
              :style="{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#1a1727',
                border: '1px solid #3f3f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: '0',
                alignSelf: 'center',
              }"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#a1a1aa"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                v-html="serviceIconPaths[claim.type] ?? serviceIconPaths.default"
              />
            </div>

            <!-- Two-line text -->
            <div :style="{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px', flex: '1', minWidth: '0', height: '44px' }">
              <span :style="{ fontSize: '18px', fontWeight: '600', color: '#e4e4e7', lineHeight: '1' }">
                {{ serviceNames[claim.type] ?? claim.type }}
              </span>
              <span :style="{ fontSize: '22px', color: '#8b5cf6', lineHeight: '1', overflow: 'hidden' }">{{ truncate(claim.identity) }}</span>
            </div>

            <!-- Verified dot -->
            <div :style="{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: '0' }" />
          </div>
        </div>

        <!-- More claims note -->
        <span
          v-if="claims.length > 5"
          :style="{ fontSize: '14px', color: '#52525b', marginTop: '12px' }"
        >and {{ claims.length - 5 }} more…</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { serviceNames, serviceIconPaths } from "~/utils/serviceData";

withDefaults(
  defineProps<{
    displayName?: string;
    handle?: string;
    avatar?: string;
    verifiedCount?: number;
    claims?: { type: string; identity?: string }[];
  }>(),
  {
    displayName: "",
    handle: "",
    avatar: "",
    verifiedCount: 0,
    claims: () => [],
  },
);

function truncate(s?: string, max = 24) {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}
</script>
