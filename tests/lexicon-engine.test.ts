import { describe, it, expect } from "vitest";
import { buildLexiconIndex, extractFeelingsAndDesires } from "../src/domain/lexicon-engine";
import rawLexicon from "../upstream/lexicon.json";

describe("Lexicon Engine", () => {
  const index = buildLexiconIndex(rawLexicon);

  it("extracts feelings from phrase with intensity modifiers", () => {
    const res = extractFeelingsAndDesires("я чувствую очень сильное спокойствие и радость", index);
    expect(res.pass).toBe(false);
    expect(res.feelings.length).toBe(2);
    const calm = res.feelings.find((f) => f.lemma === "спокойствие");
    expect(calm).toBeDefined();
    expect(calm?.intensity).toBeGreaterThan(1); // 'очень' boosts intensity
  });

  it("recognizes pass marker", () => {
    const res = extractFeelingsAndDesires("пас", index);
    expect(res.pass).toBe(true);
    expect(res.feelings.length).toBe(0);
  });

  it("extracts desires with markers", () => {
    const res = extractFeelingsAndDesires("хочется тепла и чтобы меня услышали", index);
    expect(res.desires.length).toBeGreaterThan(0);
  });
});
