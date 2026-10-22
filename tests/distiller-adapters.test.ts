import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterDistillerAdapter } from "../src/infrastructure/openrouter-distiller-adapter";
import { OllamaDistillerAdapter } from "../src/infrastructure/ollama-distiller-adapter";
import { DistillerRegistry, createDefaultDistillerRegistry } from "../src/domain/distiller-registry";
import { getDistillerConfig } from "../src/config/distiller-config";

describe("OpenRouter & Ollama Distiller Adapters (DI & Registry)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("OpenRouterDistillerAdapter posts formatted chat completions and parses JSON payload", async () => {
    const fakeResp = {
      choices: [{ message: { content: '{"phrase": "остается напряжение", "family": "тревога", "valence": -0.4}' } }],
      model: "openrouter/free",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResp,
    } as unknown as Response);

    const adapter = new OpenRouterDistillerAdapter({
      baseUrl: "https://openrouter.ai/api/v1",
      defaultModel: "openrouter/free",
      apiKey: "test-key",
      defaultTimeoutMs: 5000,
    });

    const res = await adapter.complete({
      prompt: "чувствую, что всё равно остается напряжение",
      systemPrompt: "Ты — чуткий слушатель",
      jsonFormat: true,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const callArgs = fetchSpy.mock.calls[0];
    expect(callArgs[0]).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-key");

    expect(res).not.toBeNull();
    expect(res?.content).toContain("остается напряжение");
    expect(res?.modelUsed).toBe("openrouter/free");
  });

  it("OpenRouterDistillerAdapter returns null gracefully on network failure or HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network connection lost"));

    const adapter = new OpenRouterDistillerAdapter({
      baseUrl: "/api/openrouter",
      defaultModel: "openrouter/free",
    });

    const res = await adapter.complete({ prompt: "тест" });
    expect(res).toBeNull();
  });

  it("OllamaDistillerAdapter wraps Ollama client cleanly without touching old logic", async () => {
    const fakeResp = { response: '{"phrase": "покой", "family": "покой", "valence": 0.8}' };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => fakeResp,
    } as unknown as Response);

    const adapter = new OllamaDistillerAdapter({
      baseUrl: "http://127.0.0.1:11434",
      defaultModel: "qwen2.5:1.5b",
    });

    const res = await adapter.complete({ prompt: "хочется выдохнуть" });
    expect(res).not.toBeNull();
    expect(res?.content).toContain("покой");
    expect(res?.modelUsed).toBe("qwen2.5:1.5b");
  });

  it("DistillerRegistry defaults to openrouter as active engine and allows dynamic switching", () => {
    const registry = createDefaultDistillerRegistry();
    expect(registry.getActive().id).toBe("openrouter");

    registry.setActive("ollama");
    expect(registry.getActive().id).toBe("ollama");

    expect(() => registry.setActive("unknown-engine")).toThrowError();
  });

  it("getDistillerConfig returns configurable model that defaults to nvidia/nemotron-3.5-lightning:free", () => {
    const config = getDistillerConfig();
    expect(config.defaultEngine).toBe("openrouter");
    expect(config.openrouter.model).toBe("nvidia/nemotron-3.5-lightning:free");
  });
});
