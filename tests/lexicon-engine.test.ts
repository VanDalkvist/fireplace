import { describe, it, expect } from "vitest";
import { buildLexiconIndex, extractFeelingsAndDesires, isPureFillerPhrase } from "../src/domain/lexicon-engine";
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

  it("identifies pure conversational filler phrases without semantic content", () => {
    expect(isPureFillerPhrase("как раз")).toBe(true);
    expect(isPureFillerPhrase("Как раз вот...")).toBe(true);
    expect(isPureFillerPhrase("в общем")).toBe(true);
    expect(isPureFillerPhrase("ну вот")).toBe(true);
    expect(isPureFillerPhrase("да да")).toBe(true);
    expect(isPureFillerPhrase("короче говоря")).toBe(true);

    expect(isPureFillerPhrase("большие группы контактов")).toBe(false);
    expect(isPureFillerPhrase("денис дополни что нибудь")).toBe(false);
    expect(isPureFillerPhrase("5 похожих людей")).toBe(false);
  });
});
