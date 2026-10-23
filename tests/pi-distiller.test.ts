import { afterEach, describe, expect, it, vi } from "vitest";
import { PiDistillerAdapter } from "../src/infrastructure/pi-distiller-adapter";

afterEach(() => vi.restoreAllMocks());
describe("Pi distiller plugin", () => {
  it("uses the same completion port through a same-origin server DTO", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ content: '{"phrases":[]}', modelUsed: "gpt-6-luna" })));
    const adapter = new PiDistillerAdapter();
    const result = await adapter.complete({ prompt: "реплика", systemPrompt: "система", maxTokens: 700, jsonFormat: true });
    expect(adapter.id).toBe("pi");
    expect(result?.modelUsed).toBe("gpt-6-luna");
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/pi/complete");
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toMatchObject({ prompt: "реплика", systemPrompt: "система", model: "gpt-6-luna", maxTokens: 700 });
    expect(String(fetchSpy.mock.calls[0][1]?.body)).not.toContain("apiKey");
  });
  it("does not fall back to another service on errors or invalid output", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 503 }));
    expect(await new PiDistillerAdapter().complete({ prompt: "реплика" })).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
  it("reports health without generating an utterance", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ online: true, model: "gpt-6-luna" })));
    expect((await new PiDistillerAdapter().checkHealth()).online).toBe(true);
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/pi/health");
  });
});
