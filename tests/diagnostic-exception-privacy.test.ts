import { afterEach, describe, expect, it, vi } from "vitest";
import { OllamaClient } from "@/infrastructure/ollama-client";
import { OpenRouterDistillerAdapter } from "@/infrastructure/openrouter-distiller-adapter";
import { loadSessionPersistence, loadHearthWordsPersistence, recordHearthLink } from "@/infrastructure/salon-persistence";

const SENTINEL = "SYNTHETIC_PRIVATE_SPEECH_SENTINEL";
const collectWarnings = () => vi.spyOn(console, "warn").mockImplementation(() => undefined);
const printable = (calls: unknown[][]) => JSON.stringify(calls, (_key, value: unknown) => {
  if (value && typeof value === "object" && "message" in value) {
    return { message: value.message, stack: "stack" in value ? value.stack : undefined };
  }
  return value;
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Exception diagnostic privacy", () => {
  it.each(["generate", "status"] as const)("Ollama %s does not log arbitrary exception content", async method => {
    const warn = collectWarnings();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error(SENTINEL));
    const client = new OllamaClient();
    if (method === "generate") expect(await client.generate({ model: "test", prompt: "synthetic" })).toBeNull();
    else expect(await client.checkStatus()).toEqual({ online: false, hasModel: false });
    expect(warn).toHaveBeenCalled();
    expect(printable(warn.mock.calls)).not.toContain(SENTINEL);
  });

  it("OpenRouter does not log exception messages or stacks", async () => {
    const warn = collectWarnings();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error(SENTINEL));
    expect(await new OpenRouterDistillerAdapter().complete({ prompt: "synthetic" })).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(printable(warn.mock.calls)).not.toContain(SENTINEL);
  });

  it.each(["session", "words", "links"] as const)("malformed %s data is not echoed in storage diagnostics", method => {
    const warn = collectWarnings();
    const storage = { getItem: vi.fn(() => SENTINEL), setItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
    if (method === "session") expect(loadSessionPersistence()).toBeNull();
    if (method === "words") expect(loadHearthWordsPersistence()).toEqual([]);
    if (method === "links") recordHearthLink(1, 2, "synthetic one", "synthetic two");
    expect(warn).toHaveBeenCalled();
    expect(printable(warn.mock.calls)).not.toContain(SENTINEL);
    expect(warn.mock.calls.flat().some(value => value && typeof value === "object" && "message" in value)).toBe(false);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
