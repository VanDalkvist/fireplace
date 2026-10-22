import { isPureFillerPhrase, type DistillationResult } from "./lexicon-engine";
import { OllamaClient } from "@/infrastructure/ollama-client";
import type { LlmDistillerPort } from "./distiller-types";
import { defaultDistillerRegistry } from "./distiller-registry";

export interface NeuralDistillerOptions {
  ollamaUrl?: string;
  model?: string;
  timeoutMs?: number;
  engine?: "openrouter" | "ollama";
  distillerPort?: LlmDistillerPort;
}

export interface EnrichedDistillationResult extends DistillationResult {
  repairedText?: string;
  neuralDistilled?: boolean;
  engineUsed: string;
}

interface LlmDistillPayload {
  repaired_text?: string;
  full_thought?: string;
  phrase?: string;
  phrases?: string[];
  family?: string;
  valence?: number;
  kind?: "feeling" | "desire" | "pass";
}

function parseJsonPayload(raw: string): LlmDistillPayload | null {
  try {
    return JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()) as LlmDistillPayload;
  } catch {
    return null;
  }
}

export async function distillWithNeuralFallback(
  rawText: string,
  options: NeuralDistillerOptions = {},
  recentContext: string[] = []
): Promise<EnrichedDistillationResult> {
  const normalized = rawText.trim();
  const lower = normalized.toLowerCase();

  // Fast-track explicit pass
  if (lower === "пас" || lower === "я пас" || lower === "пас сегодня") {
    return { feelings: [], desires: [], pass: true, neuralDistilled: false, engineUsed: "pass" };
  }

  // Fast-track pure conversational fillers
  if (isPureFillerPhrase(normalized)) {
    return { feelings: [], desires: [], pass: false, repairedText: normalized, neuralDistilled: false, engineUsed: "verbatim" };
  }

  const port = options.distillerPort
    || (options.engine ? defaultDistillerRegistry.get(options.engine) : undefined)
    || (options.ollamaUrl ? defaultDistillerRegistry.get("ollama") : undefined)
    || defaultDistillerRegistry.getActive();

  try {
    const contextLines = recentContext.length > 0
      ? `Контекст реплик:\n${recentContext.map((c) => `- "${c}"`).join("\n")}\n\n`
      : "";

    const systemPrompt = `Ты — чуткий слушатель в созерцательном круге чувств у костра.
Участник делится тем, что у него внутри. В спонтанной речи бывают длинные рассуждения, истории, рабочий контекст и бытовые факты.
Твоя задача — услышать за рассказом живое переживание и извлечь его ЦЕЛОСТНОЙ фразой.

ПРАВИЛА:
1. ЦЕЛОСТНОСТЬ МЫСЛИ: Стремись извлечь ОДНУ цельную живую фразу переживания, объединяющую состояние человека. Не дроби и не нарезай речь на мелкие осколки!
2. ПОДЛИННЫЙ ЯЗЫК: Сохраняй слова и самовыражение самого человека (без литературных переделок). Отрезай лишь внешнюю предысторию или пустые вводные («ну короче», «в общем»).
3. Только если в реплике действительно два принципиально разных, сменяющих друг друга чувства (например, острая тревога сменилась глубоким теплом), допустимо вернуть 2 фразы. В остальных случаях — строго 1 фраза.
4. Если в реплике нет чувств и переживаний (технический шум, проверка связи, сухие факты) — верни phrases: [].

Формат строго JSON:
{
  "phrases": ["целостная фраза переживания"],
  "family": "тревога|покой|усталость|тепло|радость|грусть|живость",
  "valence": число от -1.0 до 1.0
}`;

    const data = await port.complete(
      {
        prompt: `Реплика: "${normalized}"`,
        systemPrompt,
        model: options.model,
        jsonFormat: true,
        temperature: 0.1,
        maxTokens: 350,
      },
      options.timeoutMs
    );

    if (data?.content) {
      const parsed = parseJsonPayload(data.content);
      const engineId = port.id === "ollama" ? (options.model || "ollama") : port.id;

      const rawPhrases: string[] = [];
      if (Array.isArray(parsed?.phrases)) {
        for (const p of parsed.phrases) {
          const s = String(p).trim();
          if (s) rawPhrases.push(s);
        }
      } else if (parsed?.phrase && String(parsed.phrase).trim()) {
        rawPhrases.push(String(parsed.phrase).trim());
      }

      if (rawPhrases.length === 0) {
        return { feelings: [], desires: [], pass: false, repairedText: normalized, neuralDistilled: true, engineUsed: engineId };
      }

      const kind = parsed?.kind || "feeling";
      if (kind === "pass") {
        return { feelings: [], desires: [], pass: true, repairedText: normalized, neuralDistilled: true, engineUsed: engineId };
      }
      if (kind === "desire") {
        return {
          feelings: [],
          desires: rawPhrases.map((p) => ({ text: p, object: p, who: null })),
          pass: false,
          isDesirePhrase: true,
          repairedText: normalized,
          neuralDistilled: true,
          engineUsed: engineId,
        };
      }
      return {
        feelings: rawPhrases.map((p) => ({
          lemma: p,
          family: parsed?.family || "живость",
          valence: parsed?.valence ?? 0.0,
          arousal: 0.3,
          form: p,
          intensity: 1,
        })),
        desires: [],
        pass: false,
        repairedText: normalized,
        neuralDistilled: true,
        engineUsed: engineId,
      };
    }
  } catch (err) {
    console.warn("[distillWithNeuralFallback] Neural pipeline error, keeping verbatim text without lexicon slicing:", err);
  }

  // NO SILENT DICTIONARY FALLBACK:
  // If neural inference fails or is offline, keep the utterance intact as spoken words.
  return {
    feelings: [{
      lemma: normalized,
      family: "живость",
      valence: 0,
      arousal: 0.3,
      form: normalized,
      intensity: 1,
    }],
    desires: [],
    pass: false,
    repairedText: normalized,
    fallbackText: normalized,
    neuralDistilled: false,
    engineUsed: "verbatim",
  };
}

export function splitIntoSemanticPhrases(text: string, maxWordsPerPhrase = 8): string[] {
  const clean = text.trim();
  if (!clean) return [];

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWordsPerPhrase) {
    return [clean];
  }

  // Split on clause boundaries: punctuation (, ; : —) or strong conjunctions
  const clauseRegex = /[,;—:]|\s+(?:для того чтобы|потому что|так как|а также|чтобы|если|когда|но|а)\s+/i;
  const rawParts = clean.split(clauseRegex).map((p) => p.trim()).filter((p) => p.length > 2);

  const result: string[] = [];
  for (const part of rawParts) {
    const partWords = part.split(/\s+/).filter(Boolean);
    if (partWords.length <= maxWordsPerPhrase) {
      if (partWords.length >= 2) result.push(part);
    } else {
      let i = 0;
      while (i < partWords.length) {
        const remaining = partWords.length - i;
        const take = remaining <= maxWordsPerPhrase + 2 ? remaining : maxWordsPerPhrase;
        const chunk = partWords.slice(i, i + take).join(" ");
        if (chunk.split(/\s+/).length >= 2) {
          result.push(chunk);
        }
        i += take;
      }
    }
  }

  return result.length > 0 ? result : [clean];
}

export async function checkOllamaStatus(
  ollamaUrl = "http://127.0.0.1:11434",
  model = "qwen2.5:1.5b"
): Promise<{ online: boolean; hasModel: boolean }> {
  const client = new OllamaClient(ollamaUrl);
  return client.checkStatus(model);
}
