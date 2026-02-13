/**
 * GET /api/chat/stream
 *
 * Public SSE endpoint that streams relay chat messages to browser clients.
 * On connect, sends the recent message buffer so new visitors see context.
 */
export default defineEventHandler(async (event) => {
  const eventStream = createEventStream(event);

  // Send recent message buffer as initial burst
  for (const msg of getRecentMessages()) {
    await eventStream.push({ event: "message", data: JSON.stringify(msg) });
  }

  // Listen for new messages and forward to this client
  const remove = addChatListener((msg) => {
    eventStream.push({ event: "message", data: JSON.stringify(msg) });
  });

  eventStream.onClosed(() => remove());

  return eventStream.send();
});
