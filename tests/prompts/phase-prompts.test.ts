import { describe, it, expect } from "vitest";
import { FeelingsPromptStrategy } from "@/domain/prompts/feelings-prompt";
import { DesiresPromptStrategy } from "@/domain/prompts/desires-prompt";
import { CompletionPromptStrategy } from "@/domain/prompts/completion-prompt";

describe("FeelingsPromptStrategy", () => {
  const strategy = new FeelingsPromptStrategy();

  it("identifies as feelings phase", () => {
    expect(strategy.phase).toBe("feelings");
    expect(strategy.systemPrompt).toContain("созерцательном круге чувств");
  });

  it("builds prompt with context", () => {
    const prompt = strategy.buildPrompt("мне тревожно", ["первая мысль"]);
    expect(prompt).toContain('Контекст реплик:\n- "первая мысль"');
    expect(prompt).toContain('Реплика: "мне тревожно"');
  });

  it("parses feelings JSON output", () => {
    const rawJson = JSON.stringify({
      phrases: ["ощущаю глубокий покой"],
      family: "покой",
      valence: 0.8,
    });
    const result = strategy.parseResponse(rawJson, "ощущаю глубокий покой");
    expect(result.pass).toBe(false);
    expect(result.feelings).toHaveLength(1);
    expect(result.feelings[0].lemma).toBe("ощущаю глубокий покой");
    expect(result.feelings[0].family).toBe("покой");
    expect(result.feelings[0].valence).toBe(0.8);
  });

  it("parses pass response", () => {
    const rawJson = JSON.stringify({ phrases: [], kind: "pass" });
    const result = strategy.parseResponse(rawJson, "пас");
    expect(result.pass).toBe(true);
  });

  it("creates fallback on error", () => {
    const fallback = strategy.createFallback("сырой текст");
    expect(fallback.feelings).toHaveLength(1);
    expect(fallback.feelings[0].family).toBe("живость");
    expect(fallback.fallbackText).toBe("сырой текст");
  });
});

describe("DesiresPromptStrategy", () => {
  const strategy = new DesiresPromptStrategy();

  it("identifies as desires phase", () => {
    expect(strategy.phase).toBe("desires");
    expect(strategy.systemPrompt).toContain("желаний у костра");
  });

  it("parses desire JSON into desires array", () => {
    const rawJson = JSON.stringify({
      phrases: ["хочется выдохнуть и побыть в тишине"],
      kind: "desire",
      valence: 0.4,
    });
    const result = strategy.parseResponse(rawJson, "вся неделя суета... хочется выдохнуть");
    expect(result.pass).toBe(false);
    expect(result.isDesirePhrase).toBe(true);
    expect(result.desires).toHaveLength(1);
    expect(result.desires[0].text).toBe("хочется выдохнуть и побыть в тишине");
    expect(result.desires[0].object).toBe("хочется выдохнуть и побыть в тишине");
  });

  it("creates desire fallback on error", () => {
    const fallback = strategy.createFallback("хочу спать");
    expect(fallback.isDesirePhrase).toBe(true);
    expect(fallback.desires).toHaveLength(1);
    expect(fallback.desires[0].text).toBe("хочу спать");
    expect(fallback.fallbackText).toBe("хочу спать");
  });
});

describe("CompletionPromptStrategy", () => {
  const strategy = new CompletionPromptStrategy();

  it("identifies as completion phase", () => {
    expect(strategy.phase).toBe("completion");
    expect(strategy.systemPrompt).toContain("чекаута и интеграции");
  });

  it("parses completion takeaway into feeling token with family 'завершение'", () => {
    const rawJson = JSON.stringify({
      phrases: ["забираю тепло и понимание, что я не один"],
      family: "завершение",
      valence: 0.9,
      kind: "completion",
    });
    const result = strategy.parseResponse(rawJson, "спасибо всем... забираю тепло");
    expect(result.pass).toBe(false);
    expect(result.feelings).toHaveLength(1);
    expect(result.feelings[0].lemma).toBe("забираю тепло и понимание, что я не один");
    expect(result.feelings[0].family).toBe("завершение");
    expect(result.feelings[0].valence).toBe(0.9);
  });

  it("creates completion fallback on error", () => {
    const fallback = strategy.createFallback("спасибо кругу");
    expect(fallback.feelings).toHaveLength(1);
    expect(fallback.feelings[0].family).toBe("завершение");
    expect(fallback.fallbackText).toBe("спасибо кругу");
  });
});
