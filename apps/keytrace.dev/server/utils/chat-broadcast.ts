export interface ChatMessage {
  id: string;
  text: string;
  username: string;
  platform: string;
  gateway?: string;
  timestamp: number;
  did?: string;
  saved?: boolean;
}

const MAX_BUFFER = 100;
const messages: ChatMessage[] = [];

type Listener = (msg: ChatMessage) => void;
const listeners = new Set<Listener>();

export function broadcastMessage(msg: ChatMessage): void {
  messages.push(msg);
  if (messages.length > MAX_BUFFER) messages.shift();
  for (const listener of listeners) {
    listener(msg);
  }
}

export function addChatListener(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getRecentMessages(): ChatMessage[] {
  return [...messages];
}

export function getChatListenerCount(): number {
  return listeners.size;
}
