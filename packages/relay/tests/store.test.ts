import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStore, extractDid, extractPlatform } from "../src/store.js";

describe("extractDid", () => {
  it("extracts did:plc from text", () => {
    expect(extractDid("my identity is did:plc:abc123xyz")).toBe("did:plc:abc123xyz");
  });

  it("extracts did:web from text", () => {
    expect(extractDid("did:web:example.com is me")).toBe("did:web:example.com");
  });

  it("extracts first DID when multiple present", () => {
    expect(extractDid("did:plc:first and did:web:second")).toBe("did:plc:first");
  });

  it("returns undefined for text without DID", () => {
    expect(extractDid("hello world")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(extractDid("")).toBeUndefined();
  });

  it("handles DID as the entire message", () => {
    expect(extractDid("did:plc:ewvi7nxzyoun6zhxrhs64oiz")).toBe("did:plc:ewvi7nxzyoun6zhxrhs64oiz");
  });
});

describe("extractPlatform", () => {
  it("extracts platform from account string", () => {
    expect(extractPlatform("telegram.keytrace")).toBe("telegram");
  });

  it("handles signal account", () => {
    expect(extractPlatform("signalgo.keytrace")).toBe("signalgo");
  });

  it("handles account with no dot", () => {
    expect(extractPlatform("telegram")).toBe("telegram");
  });

  it("handles multiple dots", () => {
    expect(extractPlatform("api.relay.v2")).toBe("api");
  });
});

describe("MemoryStore", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
  });

  it("stores and retrieves a message with a DID", async () => {
    await store.put("telegram", "alice", "did:plc:abc123");
    const msg = await store.get("telegram", "alice");
    expect(msg).toBeDefined();
    expect(msg!.did).toBe("did:plc:abc123");
    expect(msg!.platform).toBe("telegram");
    expect(msg!.username).toBe("alice");
  });

  it("returns undefined for unknown user", async () => {
    expect(await store.get("telegram", "nobody")).toBeUndefined();
  });

  it("ignores messages without a DID", async () => {
    const result = await store.put("telegram", "alice", "hello world");
    expect(result).toBeUndefined();
    expect(await store.get("telegram", "alice")).toBeUndefined();
  });

  it("overwrites with latest message per user per platform", async () => {
    await store.put("telegram", "alice", "did:plc:old");
    await store.put("telegram", "alice", "did:plc:new");
    expect((await store.get("telegram", "alice"))!.did).toBe("did:plc:new");
  });

  it("stores different platforms independently", async () => {
    await store.put("telegram", "alice", "did:plc:tg");
    await store.put("signal", "alice", "did:plc:sig");
    expect((await store.get("telegram", "alice"))!.did).toBe("did:plc:tg");
    expect((await store.get("signal", "alice"))!.did).toBe("did:plc:sig");
  });

  it("is case-insensitive for usernames", async () => {
    await store.put("telegram", "Alice", "did:plc:abc123");
    expect(await store.get("telegram", "alice")).toBeDefined();
    expect(await store.get("telegram", "ALICE")).toBeDefined();
  });

  it("tracks size", async () => {
    expect(store.size).toBe(0);
    await store.put("telegram", "alice", "did:plc:a");
    expect(store.size).toBe(1);
    await store.put("signal", "bob", "did:plc:b");
    expect(store.size).toBe(2);
  });

  it("deletes messages", async () => {
    await store.put("telegram", "alice", "did:plc:a");
    expect(await store.delete("telegram", "alice")).toBe(true);
    expect(await store.get("telegram", "alice")).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it("clears all messages", async () => {
    await store.put("telegram", "alice", "did:plc:a");
    await store.put("signal", "bob", "did:plc:b");
    store.clear();
    expect(store.size).toBe(0);
  });

  it("extracts DID from longer message text", async () => {
    await store.put("telegram", "alice", "hey verify me: did:plc:abc123 thanks");
    const msg = await store.get("telegram", "alice");
    expect(msg!.did).toBe("did:plc:abc123");
    expect(msg!.raw).toBe("hey verify me: did:plc:abc123 thanks");
  });
});
