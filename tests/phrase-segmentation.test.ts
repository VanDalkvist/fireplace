import { describe, expect, it, vi } from "vitest";
import { FallbackPhraseSegmenter } from "../src/infrastructure/fallback-phrase-segmenter";
import { LosslessPhraseSegmenter } from "../src/infrastructure/lossless-phrase-segmenter";
import { OllamaPhraseSegmenter } from "../src/infrastructure/ollama-phrase-segmenter";
import { validateSegments } from "../src/domain/phrase-segmenter";

const source = "Я чувствую волнение, и одновременно мне хочется побыть рядом с вами.";
describe("configured lossless segmentation plugins", () => {
  it("rejects omissions, invented text, repetition and reordering", () => {
    for (const parts of [["тепло круга"], ["Я чувствую волнение"], [source, source], ["вами.", source]]) {
      expect(() => validateSegments(source, parts)).toThrow();
    }
  });
  it("local formatting conserves all punctuation and words", async () => {
    const parts = await new LosslessPhraseSegmenter().segment(source, 24);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(" ")).toBe(source);
  });
  it("uses only the explicitly composed next segmenter when Ollama changes text", async () => {
    const complete = vi.fn(async () => ({ content: '{"phrases":["выдуманный итог"]}', modelUsed: "test" }));
    const model = { id: "ollama", name: "Ollama", complete, checkHealth: async () => ({ online: true, model: "test" }) };
    const local = new LosslessPhraseSegmenter();
    const segmenter = new FallbackPhraseSegmenter([new OllamaPhraseSegmenter(model), local]);
    expect((await segmenter.segment(source, 24)).join(" ")).toBe(source);
    expect(complete).toHaveBeenCalledTimes(1);
    await expect(new FallbackPhraseSegmenter([new OllamaPhraseSegmenter(model)]).segment(source, 24)).rejects.toThrow();
  });
  it("accepts a valid model boundary selection without rewriting the source", async () => {
    const model = { id: "ollama", name: "Ollama", complete: async () => ({ content: JSON.stringify({ phrases: ["Я чувствую волнение,", "и одновременно мне хочется побыть рядом с вами."] }), modelUsed: "test" }), checkHealth: async () => ({ online: true, model: "test" }) };
    const parts = await new FallbackPhraseSegmenter([new OllamaPhraseSegmenter(model)]).segment(source, 50);
    expect(parts.join(" ")).toBe(source);
  });
});
