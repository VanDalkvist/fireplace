import { distillSpokenPhrase, type DistillationResult, type LexiconIndex } from "./lexicon-engine";

export interface NeuralDistillerOptions {
  ollamaUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface EnrichedDistillationResult extends DistillationResult {
  neuralDistilled?: boolean;
  engineUsed: "qwen2.5:1.5b" | "qwen2.5:0.5b" | "lexicon-fallback";
}

interface LlmDistillPayload {
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const prompt = `Ты — созерцательный слушатель у костра. Извлеки суть и сокровенное чувство из слов участника, сохранив живую метафору и отбросив бытовой шум. Если человек просто назвал свое состояние, сохрани эту суть.

Слова участника: "${trimmed}"

Выведи JSON с полями:
- phrase (строка: извлеченное чувство или образ участника)
- family (одно слово из: спокойствие, тревога, усталость, радость, нежность, грусть, живость)
- valence (число от -1.0 до 1.0)

JSON:`;

    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        format: "json",
        stream: false,
        options: { temperature: 0.15, num_predict: 96 },
      }),
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { response?: string };
      if (data.response) {
        const parsed = JSON.parse(data.response) as LlmDistillPayload;
        const phraseClean = (parsed.phrase || "").trim();
        const isTemplateLeak =
          phraseClean.includes("глубинный смысл") ||
          phraseClean.includes("живая метафора") ||
          phraseClean.includes("извлеченное чувство") ||
          phraseClean.length === 0;

        const effectivePhrase = isTemplateLeak ? trimmed : phraseClean;

        if (effectivePhrase) {
          const kind = parsed.kind || "feeling";
          if (kind === "pass") {
            return { feelings: [], desires: [], pass: true, neuralDistilled: true, engineUsed: model as "qwen2.5:1.5b" };
          }
          if (kind === "desire") {
            return {
              feelings: [],
              desires: [{ text: effectivePhrase, object: effectivePhrase, who: null }],
              pass: false,
              isDesirePhrase: true,
              neuralDistilled: true,
              engineUsed: model as "qwen2.5:1.5b",
            };
          }
          return {
            feelings: [
              {
                lemma: effectivePhrase,
                family: parsed.family || "спокойствие",
                valence: parsed.valence ?? 0.5,
                arousal: 0.3,
                form: effectivePhrase,
                intensity: 1,
              },
            ],
            desires: [],
            pass: false,
            neuralDistilled: true,
            engineUsed: model as "qwen2.5:1.5b",
          };
        }
      }
    }
  } catch {
    // Graceful degradation only on hard timeout or network disconnection
  }

  const baseResult = distillSpokenPhrase(rawText, idx);
  return { ...baseResult, neuralDistilled: false, engineUsed: "lexicon-fallback" };
}

export async function checkOllamaStatus(
  ollamaUrl = "http://127.0.0.1:11434",
  model = "qwen2.5:1.5b"
): Promise<{ online: boolean; hasModel: boolean }> {
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(600) });
    if (!res.ok) return { online: false, hasModel: false };
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models = data.models || [];
    const hasModel = models.some((m) => m.name.includes(model) || m.name.includes("qwen2.5"));
    return { online: true, hasModel };
  } catch {
    return { online: false, hasModel: false };
  }
}
