import { describe, it, expect, vi, beforeEach } from 'vitest';
import { distillPhrase as distillWithNeuralFallback } from '../src/composition/distillers';
import { OllamaClient } from '../src/infrastructure/ollama-client';
import { LosslessPhraseSegmenter } from '../src/infrastructure/lossless-phrase-segmenter';

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
      engine: "ollama",
      model: "qwen2.5:1.5b",
    });

    expect(res.neuralDistilled).toBe(true);
    expect(res.engineUsed).toBe("ollama");
    expect(res.modelUsed).toBe("qwen2.5:1.5b");
    expect(res.feelings[0].lemma).toBe("стою на краю тумана и отпускаю всё лишнее");
    expect(res.feelings[0].family).toBe("спокойствие");
  });

  it('reports exhaustion instead of inventing verbatim emotional fallback', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error("Network timeout"));
    await expect(distillWithNeuralFallback("чувствую, что всё равно остается напряжение", {
      engine: "ollama", timeoutMs: 100,
    })).rejects.toThrow("Configured distiller chain exhausted");
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

  it('routes utterances only to the explicitly selected Ollama plugin', async () => {
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
      engine: "ollama",
    });

    expect(res.feelings[0].lemma).toBe("покой у огня и замедление");
  });

  it('checks real Ollama status and identifies presence of target model', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: "qwen2.5:0.5b:latest" }] }),
    } as unknown as Response);

    const status = await new OllamaClient("http://127.0.0.1:11434").checkStatus("qwen2.5:0.5b");
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

  it('uses an explicit lossless formatting plugin without removing conjunctions', async () => {
    const text = "В общем будем пытаться давать доступ к системе, для того чтобы все присутствующие сами в этом смогли разобраться";
    const parts = await new LosslessPhraseSegmenter().segment(text, 40);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join(" ")).toBe(text);
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

  it('selects desires prompt strategy and extracts desires when phase is "desires"', async () => {
    let capturedSystemPrompt = "";
    const fakeLlmResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            phrases: ["хочется наконец выспаться и погулять"],
            kind: "desire",
            family: "желание",
            valence: 0.5,
          })
        }
      }],
      model: "openrouter/free",
    };

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      capturedSystemPrompt = body.messages.find((m: { role: string }) => m.role === "system")?.content || "";
      return {
        ok: true,
        json: async () => fakeLlmResponse,
      } as Response;
    });

    const res = await distillWithNeuralFallback("после всех этих авралов хочется наконец выспаться и погулять", {
      phase: "desires",
    });

    expect(capturedSystemPrompt).toContain("желаний у костра");
    expect(res.desires).toHaveLength(1);
    expect(res.desires[0].text).toBe("хочется наконец выспаться и погулять");
    expect(res.isDesirePhrase).toBe(true);
  });

  it('selects completion prompt strategy and extracts takeaway when phase is "completion"', async () => {
    let capturedSystemPrompt = "";
    const fakeLlmResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            phrases: ["уношу ощущение тепла и поддержки"],
            family: "завершение",
            valence: 0.8,
            kind: "completion",
          })
        }
      }],
      model: "openrouter/free",
    };

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      capturedSystemPrompt = body.messages.find((m: { role: string }) => m.role === "system")?.content || "";
      return {
        ok: true,
        json: async () => fakeLlmResponse,
      } as Response;
    });

    const res = await distillWithNeuralFallback("спасибо всем большое, уношу ощущение тепла и поддержки", {
      phase: "completion",
    });

    expect(capturedSystemPrompt).toContain("чекаута и интеграции");
    expect(res.feelings).toHaveLength(1);
    expect(res.feelings[0].lemma).toBe("уношу ощущение тепла и поддержки");
    expect(res.feelings[0].family).toBe("завершение");
  });
});
