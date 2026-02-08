import { describe, it, expect, vi } from "vitest";
import { httpGet } from "../../src/actions/http-get.js";
import type { FetchFn } from "../../src/types.js";

function mockFetch(body: string, status = 200): FetchFn {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    text: () => Promise.resolve(body),
  });
}

describe("httpGet", () => {
  it("should fetch and return text body", async () => {
    const fetch = mockFetch('{"keytrace": "kt-123"}');
    const result = await httpGet("https://example.com/data.json", fetch);
    expect(result).toBe('{"keytrace": "kt-123"}');
    expect(fetch).toHaveBeenCalledWith("https://example.com/data.json", expect.any(Object));
  });

  it("should throw on non-OK response", async () => {
    const fetch = mockFetch("Not Found", 404);
    await expect(httpGet("https://example.com/missing", fetch)).rejects.toThrow("HTTP 404");
  });

  it("should pass abort signal for timeout", async () => {
    const fetch = mockFetch("ok");
    await httpGet("https://example.com", fetch, 5000);
    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[1]).toHaveProperty("signal");
  });
});
