import { distillSpokenPhrase, type DistillationResult, type LexiconIndex } from "./lexicon-engine";
import { OllamaClient } from "@/infrastructure/ollama-client";

export interface NeuralDistillerOptions {
  ollamaUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface EnrichedDistillationResult extends DistillationResult {
  repairedText?: string;
  neuralDistilled?: boolean;
  engineUsed: "qwen2.5:1.5b" | "qwen2.5:0.5b" | "lexicon-fallback";
}

interface LlmDistillPayload {
  repaired_text?: string;
  phrase?: string;
  family?: string;
  valence?: number;
  kind?: "feeling" | "desire" | "pass";
}

export async function distillWithNeuralFallback(
  rawText: string,
  idx: LexiconIndex,
  options: NeuralDistillerOptions = {}
): Promise<EnrichedDistillationResult> {
  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();

  // Fast-track explicit pass
  if (lower === "пас" || lower === "я пас" || lower === "пас сегодня") {
    return { feelings: [], desires: [], pass: true, neuralDistilled: false, engineUsed: "qwen2.5:1.5b" };
  }

  // Pure Neural Routing: everything flows to Qwen to preserve essence, metaphor, and depth
  const ollamaUrl = options.ollamaUrl || "http://127.0.0.1:11434";
  const model = options.model || "qwen2.5:1.5b";
  const timeoutMs = options.timeoutMs ?? 2000;

  try {
    const client = new OllamaClient(ollamaUrl);
    const prompt = `Ты — созерцательный слушатель у костра. Твоя задача:
1. Исправь опечатки и ослышки распознавания речи в высказывании участника.
2. Сохрани живые слова и смысл высказывания человека целиком. Не обрезай до одного слова!

Слова участника: "${trimmed}"

Выведи JSON с полями:
- repaired_text (строка: исправленный чистый текст высказывания без опечаток)
- phrase (строка: емкая мысль или живая фраза от 2 до 5 слов, не обрезай до одного слова)
- family (одно слово: покой, тепло, грусть, благодарность, уязвимость, радость, усталость или другое точное слово)
- valence (число от -1.0 до 1.0)

JSON:`;

    const data = await client.generate(
      {
        model,
        prompt,
        format: "json",
        stream: false,
        options: { temperature: 0.15, num_predict: 96 },
      },
      timeoutMs
    );

    if (data?.response) {
      const parsed = JSON.parse(data.response) as LlmDistillPayload;
      const phraseClean = (parsed.phrase || "").trim();
      const repaired = (parsed.repaired_text || "").trim() || trimmed;

      const phraseWords = phraseClean.split(/\s+/).filter(Boolean);
      const repairedWords = repaired.split(/\s+/).filter(Boolean);

      // Guard against 1-word amputations (e.g. "работает", "поиграй", "туш") when utterance had full thought
      const isAmputationOrLeak =
        phraseClean.length === 0 ||
        phraseClean.includes("глубинный смысл") ||
        phraseClean.includes("живая метафора") ||
        phraseClean.includes("извлеченное чувство") ||
        (phraseWords.length <= 1 && repairedWords.length >= 2);

      const effectivePhrase = isAmputationOrLeak ? repaired : phraseClean;

      if (effectivePhrase) {
        const kind = parsed.kind || "feeling";
        if (kind === "pass") {
          return {
            feelings: [],
            desires: [],
            pass: true,
            repairedText: repaired,
            neuralDistilled: true,
            engineUsed: model as "qwen2.5:1.5b",
          };
        }
        if (kind === "desire") {
          return {
            feelings: [],
            desires: [{ text: effectivePhrase, object: effectivePhrase, who: null }],
            pass: false,
            isDesirePhrase: true,
            repairedText: repaired,
            neuralDistilled: true,
            engineUsed: model as "qwen2.5:1.5b",
          };
        }
        return {
          feelings: [
            {
              lemma: effectivePhrase,
              family: parsed.family || "живость",
              valence: parsed.valence ?? 0.5,
              arousal: 0.3,
              form: effectivePhrase,
              intensity: 1,
            },
          ],
          desires: [],
          pass: false,
          repairedText: repaired,
          neuralDistilled: true,
          engineUsed: model as "qwen2.5:1.5b",
        };
      }
    }
  } catch (err) {
    console.warn("[distillWithNeuralFallback] Neural pipeline fallback to lexicon:", err);
  }

  const baseResult = distillSpokenPhrase(rawText, idx);
  return { ...baseResult, neuralDistilled: false, engineUsed: "lexicon-fallback" };
}

export async function checkOllamaStatus(
  ollamaUrl = "http://127.0.0.1:11434",
  model = "qwen2.5:1.5b"
): Promise<{ online: boolean; hasModel: boolean }> {
  const client = new OllamaClient(ollamaUrl);
  return client.checkStatus(model);
}
