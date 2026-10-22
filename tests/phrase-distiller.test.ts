import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defaultLexiconIndex } from '../src/domain/lexicon-provider';
import { distillWithNeuralFallback, checkOllamaStatus, splitIntoSemanticPhrases } from '../src/domain/phrase-distiller';

describe('Neural Phrase Distiller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('suppresses pure conversational fillers like "как раз" without adding them to hearth', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await distillWithNeuralFallback("как раз", defaultLexiconIndex);

    expect(res.feelings.length).toBe(0);
    expect(res.desires.length).toBe(0);
    expect(res.pass).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fast-tracks explicit pass phrases without calling neural endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await distillWithNeuralFallback("пас", defaultLexiconIndex);

    expect(res.pass).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('routes utterances to Qwen and extracts rich emotional essence and metaphors', async () => {
    const fakeLlmResponse = {
      response: JSON.stringify({
        phrase: "стою на краю тумана и отпускаю всё лишнее",
        family: "спокойствие",
        valence: 0.8,
        kind: "feeling"
      })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLlmResponse,
    } as unknown as Response);

    const rawUtterance = "Ну короче я сегодня утром так устал от созвонов, но сейчас сижу у огня и такое ощущение будто стою на краю тумана и отпускаю всё лишнее";
    const res = await distillWithNeuralFallback(rawUtterance, defaultLexiconIndex, {
      ollamaUrl: "http://127.0.0.1:11434",
      model: "qwen2.5:1.5b",
    });

    expect(res.neuralDistilled).toBe(true);
    expect(res.engineUsed).toBe("qwen2.5:1.5b");
    expect(res.feelings[0].lemma).toBe("стою на краю тумана и отпускаю всё лишнее");
    expect(res.feelings[0].family).toBe("спокойствие");
  });

  it('gracefully degrades to Tier 1 semantic core when neural endpoint times out or errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error("Network timeout"));

    const longUtterance = "Ну знаете мне сейчас прямо как-то расфокусированно и сумбурно в мыслях";
    const res = await distillWithNeuralFallback(longUtterance, defaultLexiconIndex, {
      ollamaUrl: "http://127.0.0.1:11434",
      timeoutMs: 100
    });

    expect(res.neuralDistilled).toBe(false);
    expect(res.engineUsed).toBe("lexicon-fallback");
    expect(res.fallbackText).toBeDefined();
    expect(res.fallbackText).toContain("сумбурно");
  });

  it('guards against prompt template leakage and falls back to original phrase', async () => {
    const fakeLlmResponse = {
      response: JSON.stringify({
        phrase: "глубинный смысл или живая метафора",
        family: "спокойствие",
        valence: 0.5,
      })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLlmResponse,
    } as unknown as Response);

    const rawUtterance = "мне очень тепло и уютно у костра";
    const res = await distillWithNeuralFallback(rawUtterance, defaultLexiconIndex);

    expect(res.feelings[0].lemma).toBe("мне очень тепло и уютно у костра");
    expect(res.feelings[0].lemma).not.toContain("глубинный смысл");
  });

  it('repairs ASR recognition errors in Pass 2 and returns repairedText alongside feelings', async () => {
    const fakeLlmResponse = {
      response: JSON.stringify({
        repaired_text: "покой у огня и замедление",
        phrase: "покой у огня",
        family: "спокойствие",
        valence: 0.8,
      })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLlmResponse,
    } as unknown as Response);

    const noisyAsrUtterance = "покою огня и за медленнее";
    const res = await distillWithNeuralFallback(noisyAsrUtterance, defaultLexiconIndex, {
      ollamaUrl: "http://127.0.0.1:11434",
    });

    expect(res.repairedText).toBe("покой у огня и замедление");
    expect(res.feelings[0].lemma).toBe("покой у огня");
  });

  it('checks real Ollama status and identifies presence of target model', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: "qwen2.5:0.5b:latest" }] }),
    } as unknown as Response);

    const status = await checkOllamaStatus("http://127.0.0.1:11434", "qwen2.5:0.5b");
    expect(status.online).toBe(true);
    expect(status.hasModel).toBe(true);
  });

  it('guards against single-word amputations from LLM and preserves full meaningful phrase', async () => {
    const fakeLlmResponse = {
      response: JSON.stringify({
        repaired_text: "Распознавание голоса работает",
        phrase: "работает", // 1-word amputation
        family: "радость",
        valence: 0.8,
      })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLlmResponse,
    } as unknown as Response);

    const utterance = "Распознавание голоса работает";
    const res = await distillWithNeuralFallback(utterance, defaultLexiconIndex);

    // Must NOT be severed to "работает" alone — must preserve full meaningful utterance
    expect(res.feelings[0].lemma).toBe("Распознавание голоса работает");
  });

  it('splits long conversational compound sentences into multiple meaningful semantic phrases', () => {
    const longSentence = "В общем будем пытаться давать доступ к системе, для того чтобы все присутствующие сами в этом смогли разобраться";
    const phrases = splitIntoSemanticPhrases(longSentence, 6);

    expect(phrases.length).toBeGreaterThanOrEqual(2);
    expect(phrases[0]).toContain("будем пытаться давать доступ");
    expect(phrases[1]).toContain("все присутствующие сами");
  });
});
