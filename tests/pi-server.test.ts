import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPiHandler } from "../server/pi-plugin";
import type { PiRuntimePort } from "../server/pi-runtime";

let server: Server;
let base: string;
let runtime: PiRuntimePort;
beforeEach(async () => {
  runtime = {
    complete: vi.fn(async () => ({ content: '{"phrases":[]}', modelUsed: "gpt-6-luna" })),
    health: vi.fn(async () => ({ online: true, model: "gpt-6-luna" })),
  };
  const handler = createPiHandler(runtime);
  server = createServer((req, res) => { void handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server unavailable");
  base = `http://127.0.0.1:${address.port}`;
});
afterEach(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

describe("Pi server DTO and credential boundary", () => {
  it("accepts a same-origin completion and sends only the parsed allowlisted DTO", async () => {
    const response = await fetch(base + "/complete", { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: "реплика", model: "gpt-6-luna", maxTokens: 500, apiKey: "must-not-forward" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ modelUsed: "gpt-6-luna" });
    const request = vi.mocked(runtime.complete).mock.calls[0][0];
    expect(request).toEqual({ prompt: "реплика", systemPrompt: undefined, model: "gpt-6-luna", maxTokens: 500 });
  });
  it("rejects another origin and does not invoke Pi", async () => {
    const response = await fetch(base + "/complete", { method: "POST", headers: { Origin: "https://untrusted.invalid" }, body: '{"prompt":"x"}' });
    expect(response.status).toBe(403);
    expect(runtime.complete).not.toHaveBeenCalled();
  });
  it("rejects malformed, oversized, wrong-method and provider-injection requests", async () => {
    for (const [body, status] of [["{", 400], [JSON.stringify({ prompt: "x", model: "other-provider/model" }), 400], [JSON.stringify({ prompt: "x", maxTokens: -1 }), 400], [JSON.stringify({ prompt: "x".repeat(66000) }), 413]] as const) {
      expect((await fetch(base + "/complete", { method: "POST", body })).status).toBe(status);
    }
    expect((await fetch(base + "/complete")).status).toBe(405);
    expect(runtime.complete).not.toHaveBeenCalled();
  });
  it("aborts provider work when the requesting client disconnects", async () => {
    let started: (() => void) | undefined;
    const began = new Promise<void>(resolve => { started = resolve; });
    let cancelled = false;
    vi.mocked(runtime.complete).mockImplementation((_request, signal) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => { cancelled = true; reject(new Error("aborted")); }, { once: true });
      started?.();
    }));
    const controller = new AbortController();
    const request = fetch(base + "/complete", { method: "POST", body: '{"prompt":"x"}', signal: controller.signal });
    await began;
    controller.abort();
    await expect(request).rejects.toThrow();
    for (let attempt = 0; !cancelled && attempt < 20; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
    expect(cancelled).toBe(true);
  });

  it("reports health without completion and sanitizes provider errors", async () => {
    expect((await fetch(base + "/health")).status).toBe(200);
    expect(runtime.complete).not.toHaveBeenCalled();
    vi.mocked(runtime.complete).mockRejectedValue(new Error("private-provider-detail"));
    const response = await fetch(base + "/complete", { method: "POST", body: '{"prompt":"x"}' });
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-provider-detail");
  });
});
