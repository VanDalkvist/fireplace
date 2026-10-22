import { isPureFillerPhrase, type DistillationResult } from "./lexicon-engine";
import { OllamaClient } from "@/infrastructure/ollama-client";
import type { LlmDistillerPort } from "./distiller-types";
import { defaultDistillerRegistry } from "./distiller-registry";
import { defaultPromptRegistry } from "./prompts/prompt-registry";
import type { SessionPhase } from "./types";

export interface NeuralDistillerOptions {
  ollamaUrl?: string;
  model?: string;
  timeoutMs?: number;
  engine?: "openrouter" | "ollama";
  distillerPort?: LlmDistillerPort;
  phase?: SessionPhase;
}

export interface EnrichedDistillationResult extends DistillationResult {
  repairedText?: string;
  neuralDistilled?: boolean;
  engineUsed: string;
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

  const strategy = defaultPromptRegistry.get(options.phase || "feelings");

  try {
    const prompt = strategy.buildPrompt(normalized, recentContext);

    const data = await port.complete(
      {
        prompt,
        systemPrompt: strategy.systemPrompt,
        model: options.model,
        jsonFormat: true,
        temperature: 0.1,
        maxTokens: 350,
      },
      options.timeoutMs
    );

    if (data?.content) {
      const parsed = strategy.parseResponse(data.content, normalized);
      const engineId = port.id === "ollama" ? (options.model || "ollama") : port.id;

      return {
        ...parsed,
        neuralDistilled: true,
        engineUsed: engineId,
      };
    }
  } catch (err) {
    console.warn("[distillWithNeuralFallback] Neural pipeline error, using strategy fallback:", err);
  }

  // NO SILENT DICTIONARY FALLBACK:
  // If neural inference fails or is offline, keep the utterance intact as spoken words via strategy fallback.
  const fallback = strategy.createFallback(normalized);
  return {
    ...fallback,
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
