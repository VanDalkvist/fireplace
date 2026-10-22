import { describe, it, expect, vi, beforeEach } from 'vitest';
import { distillWithNeuralFallback, checkOllamaStatus, splitIntoSemanticPhrases } from '../src/domain/phrase-distiller';

describe('Neural Phrase Distiller', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('suppresses pure conversational fillers like "как раз" without adding them to hearth', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await distillWithNeuralFallback("как раз");

    expect(res.feelings.length).toBe(0);
    expect(res.desires.length).toBe(0);
    expect(res.pass).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fast-tracks explicit pass phrases without calling neural endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await distillWithNeuralFallback("пас");

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
    const res = await distillWithNeuralFallback(rawUtterance, {
      ollamaUrl: "http://127.0.0.1:11434",
      model: "qwen2.5:1.5b",
    });

    expect(res.neuralDistilled).toBe(true);
    expect(res.engineUsed).toBe("qwen2.5:1.5b");
    expect(res.feelings[0].lemma).toBe("стою на краю тумана и отпускаю всё лишнее");
    expect(res.feelings[0].family).toBe("спокойствие");
  });

  it('preserves intact verbatim speech without lexicon slicing when neural endpoint times out or errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error("Network timeout"));

    const longUtterance = "чувствую, что всё равно остается напряжение";
    const res = await distillWithNeuralFallback(longUtterance, {
      ollamaUrl: "http://127.0.0.1:11434",
      timeoutMs: 100
    });

    expect(res.neuralDistilled).toBe(false);
    expect(res.engineUsed).toBe("verbatim");
    expect(res.feelings.length).toBe(1);
    expect(res.feelings[0].lemma).toBe(longUtterance);
  });

  it('extracts multiple emotional phrases from rambling speech directly through LLM', async () => {
    const fakeLlmResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            phrases: ["накатила тревога и растерянность", "глубокое тихое тепло"],
            family: "тепло",
            valence: 0.6,
          })
        }
      }],
      model: "nvidia/nemotron-3.5-lightning:free",
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLlmResponse,
    } as unknown as Response);

    const utterance = "Вчера было тяжело из-за новостей, прям накатила тревога и растерянность, а сейчас вот сижу с вами в кругу и чувствую очень глубокое тихое тепло.";
    const res = await distillWithNeuralFallback(utterance);

    expect(res.neuralDistilled).toBe(true);
    expect(res.feelings.length).toBe(2);
    expect(res.feelings[0].lemma).toBe("накатила тревога и растерянность");
    expect(res.feelings[1].lemma).toBe("глубокое тихое тепло");
  });

  it('routes utterances to Qwen when ollamaUrl is specified', async () => {
    const fakeLlmResponse = {
      response: JSON.stringify({
        phrases: ["покой у огня и замедление"],
        family: "спокойствие",
        valence: 0.8,
      })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLlmResponse,
    } as unknown as Response);

    const noisyAsrUtterance = "покою огня и за медленнее";
    const res = await distillWithNeuralFallback(noisyAsrUtterance, {
      ollamaUrl: "http://127.0.0.1:11434",
    });

    expect(res.feelings[0].lemma).toBe("покой у огня и замедление");
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

  it('handles desire phrases directly from neural output', async () => {
    const fakeLlmResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            kind: "desire",
            phrases: ["хочется просто выдохнуть и побыть в тишине"],
            family: "покой",
            valence: 0.8,
          })
        }
      }],
      model: "nvidia/nemotron-3.5-lightning:free",
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLlmResponse,
    } as unknown as Response);

    const utterance = "хочется просто выдохнуть и побыть в тишине";
    const res = await distillWithNeuralFallback(utterance);

    expect(res.desires.length).toBe(1);
    expect(res.desires[0].text).toBe("хочется просто выдохнуть и побыть в тишине");
  });

  it('splits long conversational compound sentences into multiple meaningful semantic phrases', () => {
    const longSentence = "В общем будем пытаться давать доступ к системе, для того чтобы все присутствующие сами в этом смогли разобраться";
    const phrases = splitIntoSemanticPhrases(longSentence, 6);

    expect(phrases.length).toBeGreaterThanOrEqual(2);
    expect(phrases[0]).toContain("будем пытаться давать доступ");
    expect(phrases[1]).toContain("все присутствующие сами");
  });

  it('suppresses meeting operational noise when neural model returns empty phrase', async () => {
    const fakeLlmResponse = {
      choices: [{ message: { content: JSON.stringify({ phrase: "", family: "покой", valence: 0.0 }) } }],
      model: "openrouter/free",
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeLlmResponse,
    } as unknown as Response);

    const res = await distillWithNeuralFallback("ты слышишь меня?");
    expect(res.feelings.length).toBe(0);
    expect(res.desires.length).toBe(0);
  });
});
