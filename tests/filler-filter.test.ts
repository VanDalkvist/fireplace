import { describe, it, expect } from "vitest";
import { isPureFillerPhrase } from "../src/domain/lexicon-engine";

describe("Conversational Filler Filter", () => {
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
