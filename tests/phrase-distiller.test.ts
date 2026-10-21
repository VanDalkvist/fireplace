import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defaultLexiconIndex } from '../src/domain/lexicon-provider';
import { distillWithNeuralFallback, checkOllamaStatus } from '../src/domain/phrase-distiller';

describe('Neural Phrase Distiller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it('checks real Ollama status and identifies presence of target model', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: "qwen2.5:0.5b:latest" }] }),
    } as unknown as Response);

    const status = await checkOllamaStatus("http://127.0.0.1:11434", "qwen2.5:0.5b");
    expect(status.online).toBe(true);
    expect(status.hasModel).toBe(true);
  });
});
