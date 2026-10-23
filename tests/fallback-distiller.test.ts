import { describe, expect, it, vi } from "vitest";
import { FallbackDistillerAdapter } from "../src/infrastructure/fallback-distiller-adapter";
import { DistillerRegistry } from "../src/domain/distiller-registry";
import { distillWithNeuralFallback } from "../src/domain/phrase-distiller";
import type { LlmDistillerPort } from "../src/domain/distiller-types";
import { dispatchDistilledResult } from "../src/domain/token-subsumption";

const adapter = (id: string, output: string | null): LlmDistillerPort => ({
  id, name: id,
  complete: vi.fn(async () => output === null ? null : ({ content: output, modelUsed: id + "-model" })),
  checkHealth: async () => ({ online: output !== null, model: id + "-model" }),
});

describe("explicit distiller fallback decorators", () => {
  it("uses only the configured order and records the adapter that actually succeeded", async () => {
    const first = adapter("first", null), second = adapter("second", '{"phrases":[]}');
    const wrapper = new FallbackDistillerAdapter([first, second]);
    expect((await wrapper.complete({ prompt: "source" }))?.adapterId).toBe("second");
    expect(first.complete).toHaveBeenCalledTimes(1);
    expect(second.complete).toHaveBeenCalledTimes(1);
  });

  it("does not send a primary provider model override to another provider", async () => {
    const first = adapter("first", null), second = adapter("second", '{"phrases":[]}');
    await new FallbackDistillerAdapter([first, second]).complete({ prompt: "source", model: "primary-only-model" });
    expect(vi.mocked(second.complete).mock.calls[0][0].model).toBeUndefined();
  });

  it("does not retry successful intentional suppression", async () => {
    const first = adapter("first", '{"phrases":[]}'), second = adapter("second", "invented");
    const wrapper = new FallbackDistillerAdapter([first, second]);
    expect((await wrapper.complete({ prompt: "source" }))?.content).toBe('{"phrases":[]}');
    expect(second.complete).not.toHaveBeenCalled();
  });

  it("retries malformed semantic output only inside the configured wrapper", async () => {
    const first = adapter("first", "not JSON"), second = adapter("second", '{"phrases":[]}');
    const wrapper = new FallbackDistillerAdapter([first, second]);
    const result = await wrapper.complete({ prompt: "source" }, 1000, content => { JSON.parse(content); });
    expect(result?.adapterId).toBe("second");
  });

  it("fails explicitly after all configured adapters fail, without synthesizing raw feelings", async () => {
    const wrapper = new FallbackDistillerAdapter([adapter("offline", null)]);
    await expect(distillWithNeuralFallback("я чувствую усталость", { distillerPort: wrapper })).rejects.toThrow();
    await expect(distillWithNeuralFallback("я чувствую усталость")).rejects.toThrow();
  });

  it("never substitutes the first registered adapter for an unknown active ID", () => {
    const registry = new DistillerRegistry("missing");
    registry.register(adapter("first", "valid"));
    expect(() => registry.getActive()).toThrow();
  });

  it("does not expand an empty extraction into an unconfigured raw-text fallback", () => {
    const add = vi.fn();
    dispatchDistilledResult({ feelings: [], desires: [], pass: false, engineUsed: "test" }, "technical noise", {
      phase: "feelings", speakerId: 1, recent: null, onAddFeeling: add, onAddDesire: add,
    });
    expect(add).not.toHaveBeenCalled();
  });
});
