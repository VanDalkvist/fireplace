import { describe, it, expect } from 'vitest';
import { defaultLexiconIndex } from '../src/domain/lexicon-provider';
import { distillSpokenPhrase } from '../src/domain/lexicon-engine';

describe('Lexicon Conversational Distiller', () => {
  it('extracts exact feelings even when surrounded by conversational filler', () => {
    const res = distillSpokenPhrase(
      "Ну в общем у меня сейчас сильная усталость в теле",
      defaultLexiconIndex
    );

    expect(res.pass).toBe(false);
    expect(res.feelings.length).toBeGreaterThan(0);
    expect(res.feelings[0].lemma).toBe("усталость");
    expect(res.feelings[0].family).toBe("усталость");
  });

  it('detects conversational pass phrases cleanly', () => {
    const res1 = distillSpokenPhrase("я пас сегодня", defaultLexiconIndex);
    expect(res1.pass).toBe(true);

    const res2 = distillSpokenPhrase("помолчу просто", defaultLexiconIndex);
    expect(res2.pass).toBe(true);
  });

  it('detects conversational desires with markers', () => {
    const res = distillSpokenPhrase(
      "Мне очень хочется тишины и просто побыть с собой",
      defaultLexiconIndex
    );

    expect(res.desires.length).toBeGreaterThan(0);
    expect(res.desires[0].object).toBe("тишины");
  });

  it('distills unlisted conversational speech into a clean, concise kernel (max 3-4 words)', () => {
    const res = distillSpokenPhrase(
      "Ну знаете мне сейчас прямо как-то сумбурно в мыслях",
      defaultLexiconIndex
    );

    // If no exact dictionary hit, should strip fillers and produce a clean kernel
    expect(res.fallbackText).toBeDefined();
    expect(res.fallbackText?.split(' ').length).toBeLessThanOrEqual(4);
    expect(res.fallbackText).not.toContain("знаете");
    expect(res.fallbackText).not.toContain("прямо");
    expect(res.fallbackText).toContain("сумбурно");
  });
});
