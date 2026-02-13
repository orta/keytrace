<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-zinc-100 tracking-tight">Public Relay</h1>
      <p class="text-sm text-zinc-500 mt-1">
        Live messages from chat platforms bridged through Matterbridge. Messages containing a DID are saved for identity verification.
      </p>
    </div>

    <!-- Connection status -->
    <div class="mb-4 flex items-center gap-2 text-xs text-zinc-500">
      <span class="w-2 h-2 rounded-full" :class="connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'" />
      {{ connected ? `Connected` : "Reconnecting..." }}
      <span v-if="connected && listenerInfo" class="text-zinc-600">{{ listenerInfo }}</span>
    </div>

    <!-- Message feed -->
    <div
      ref="feedRef"
      class="space-y-0.5 max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-800/50 bg-kt-surface p-2"
    >
      <ChatMessageRow v-for="msg in messages" :key="msg.id" :message="msg" />

      <!-- Empty state -->
      <div v-if="messages.length === 0" class="text-center py-16 text-zinc-600 text-sm">Waiting for messages...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";

useSeoMeta({
  title: "Public Relay - Keytrace",
  description: "Live chat relay showing identity verification messages from 20+ platforms.",
});

interface ChatMessage {
  id: string;
  text: string;
  username: string;
  platform: string;
  timestamp: number;
  did?: string;
  saved?: boolean;
}

const messages = ref<ChatMessage[]>([]);
const connected = ref(false);
const feedRef = ref<HTMLElement | null>(null);
const listenerInfo = ref("");
let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function isNearBottom(): boolean {
  if (!feedRef.value) return true;
  const { scrollTop, scrollHeight, clientHeight } = feedRef.value;
  return scrollHeight - scrollTop - clientHeight < 100;
}

function scrollToBottom() {
  nextTick(() => {
    if (feedRef.value && isNearBottom()) {
      feedRef.value.scrollTop = feedRef.value.scrollHeight;
    }
  });
}

function connect() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource("/api/chat/stream");

  eventSource.addEventListener("message", (e) => {
    const msg: ChatMessage = JSON.parse(e.data);
    messages.value.push(msg);
    // Cap at 500 messages client-side
    if (messages.value.length > 500) {
      messages.value = messages.value.slice(-500);
    }
    scrollToBottom();
  });

  eventSource.onopen = () => {
    connected.value = true;
  };

  eventSource.onerror = () => {
    connected.value = false;
    eventSource?.close();
    eventSource = null;
    reconnectTimer = setTimeout(connect, 3000);
  };
}

onMounted(() => connect());

onUnmounted(() => {
  eventSource?.close();
  eventSource = null;
  if (reconnectTimer) clearTimeout(reconnectTimer);
});
</script>
