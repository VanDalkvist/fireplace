import { distillSpokenPhrase, type DistillationResult, type LexiconIndex } from "./lexicon-engine";

export interface NeuralDistillerOptions {
  ollamaUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface EnrichedDistillationResult extends DistillationResult {
  neuralDistilled?: boolean;
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
  const baseResult = distillSpokenPhrase(rawText, idx);
  const words = rawText.trim().split(/\s+/);

  // Short phrases or direct lexicon matches don't need neural processing (Tier 1)
  if (baseResult.pass || (baseResult.feelings.length > 0 && words.length <= 4) || baseResult.desires.length > 0) {
    return { ...baseResult, neuralDistilled: false };
  }

  // Tier 2: Fast micro-LLM distillation for complex, long conversational monologues
  const ollamaUrl = options.ollamaUrl || "http://127.0.0.1:11434";
  const model = options.model || "qwen2.5:0.5b";
  const timeoutMs = options.timeoutMs ?? 800;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const prompt = `Ты смысловой дистиллятор чувств для Салона присутствия у костра.
Участник сказал фразу: "${rawText}"
Сожми её до самого главного соматического чувства или желания (строго 1-3 слова).
Ответь ТОЛЬКО валидным JSON: {"phrase": "краткое чувство", "family": "спокойствие|усталость|тревога|радость|нежность|грусть", "valence": 0.5, "kind": "feeling"}`;

    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        format: "json",
        stream: false,
        options: { temperature: 0.1, num_predict: 64 },
      }),
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as { response?: string };
      if (data.response) {
        const parsed = JSON.parse(data.response) as LlmDistillPayload;
        if (parsed.phrase) {
          const kind = parsed.kind || "feeling";
          if (kind === "pass") {
            return { feelings: [], desires: [], pass: true, neuralDistilled: true };
          }
          if (kind === "desire") {
            return {
              feelings: [],
              desires: [{ text: parsed.phrase, object: parsed.phrase, who: null }],
              pass: false,
              isDesirePhrase: true,
              neuralDistilled: true,
            };
          }
          return {
            feelings: [
              {
                lemma: parsed.phrase,
                family: parsed.family || "живость",
                valence: parsed.valence ?? 0,
                arousal: 0.2,
                form: parsed.phrase,
                intensity: 1,
              },
            ],
            desires: [],
            pass: false,
            neuralDistilled: true,
          };
        }
      }
    }
  } catch {
    // Graceful degradation to Tier 1 semantic core on timeout or network rejection
  }

  return { ...baseResult, neuralDistilled: false };
}
