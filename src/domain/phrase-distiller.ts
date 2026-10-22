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
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as LlmDistillPayload;
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
Участник делится переживаниями. Собери из его спонтанной речи емкую, живую мысль для круга.
ПРАВИЛА:
1. Убирай слова-паразиты («ну как бы», «в общем», «типа», «так сказать», «короче»), заикания и повторы.
2. Сохраняй живой голос и суть переживания (без сухого канцелярита).
3. Если мыслей несколько — выдели phrases: ["первая мысль", "вторая мысль"].
4. Не разбивай мысль на вводные частицы или наречия («всё равно», «как будто», «вроде бы» не являются отдельными мыслями, а дополняют целое переживание).
5. Фоновый шум или обрывки («меня слышно?», «смотри») -> верни phrase: "".
ПРИМЕРЫ:
"чувствую, что всё равно остается напряжение" -> {"full_thought": "чувствую, что всё равно остается напряжение", "phrase": "остается напряжение", "family": "тревога", "valence": -0.4}
"ну мы вчера долго сидели и я прям почувствовал такую усталость" -> {"full_thought": "почувствовал сильную усталость после долгого дня", "phrase": "сильная усталость", "family": "усталость", "valence": -0.4}
"хочется просто выдохнуть и побыть в тишине" -> {"full_thought": "хочется просто выдохнуть и побыть в тишине", "phrase": "выдохнуть и побыть в тишине", "family": "покой", "valence": 0.8}
"мне сейчас немного тревожно, но чувствую тепло круга" -> {"full_thought": "чувствую тревогу, но ощущаю тепло круга", "phrases": ["немного тревожно", "тепло круга"], "family": "тепло", "valence": 0.5}
"алло раз два слышно меня да" -> {"phrase": "", "family": "покой", "valence": 0.0}`;

    const userPrompt = `${contextLines}Высказывание: "${normalized}"
Выведи строго JSON:
- full_thought (связная очищенная мысль целиком)
- phrase (емкая мысль 3–7 слов или "" если мусор)
- phrases (массив строк, если мыслей несколько)
- family (покой, тепло, радость, открытость, ясность, тревога, усталость, грусть)
- valence (-1.0..1.0)
JSON:`;

    const data = await port.complete(
      {
        prompt: userPrompt,
        systemPrompt,
        model: options.model,
        jsonFormat: true,
        temperature: 0.15,
        maxTokens: 96,
      },
      options.timeoutMs
    );

    if (data?.content) {
      const parsed = parseJsonPayload(data.content);
      const phraseClean = (parsed?.phrase || "").trim();
      const repaired = (parsed?.full_thought || parsed?.repaired_text || "").trim() || normalized;

      const engineId = port.id === "ollama" ? (options.model || "ollama") : port.id;

      if (!phraseClean && !parsed?.phrases?.length) {
        return { feelings: [], desires: [], pass: false, repairedText: repaired, neuralDistilled: true, engineUsed: engineId };
      }

      const phraseWords = phraseClean.split(/\s+/).filter(Boolean);
      const repairedWords = repaired.split(/\s+/).filter(Boolean);

      // Guard against 1-word amputations and prompt template leaks
      const isAmputationOrLeak =
        phraseClean.includes("глубинный смысл") ||
        phraseClean.includes("живая метафора") ||
        phraseClean.includes("извлеченное чувство") ||
        (phraseWords.length <= 1 && repairedWords.length >= 2 && phraseClean.length > 0);

      const singlePhrase = isAmputationOrLeak ? repaired : (phraseClean || repaired);

      const rawPhrases = Array.isArray(parsed?.phrases) && (parsed?.phrases?.length ?? 0) > 0
        ? (parsed?.phrases ?? []).map((p) => p.trim()).filter((p) => p.length > 0 && !isPureFillerPhrase(p))
        : [];
      const phraseList = rawPhrases.length > 0 ? rawPhrases : (singlePhrase ? [singlePhrase] : []);

      if (phraseList.length > 0) {
        const kind = parsed?.kind || "feeling";
        if (kind === "pass") {
          return { feelings: [], desires: [], pass: true, repairedText: repaired, neuralDistilled: true, engineUsed: engineId };
        }
        if (kind === "desire") {
          return {
            feelings: [],
            desires: phraseList.map((p) => ({ text: p, object: p, who: null })),
            pass: false,
            isDesirePhrase: true,
            repairedText: repaired,
            neuralDistilled: true,
            engineUsed: engineId,
          };
        }
        return {
          feelings: phraseList.map((p) => ({
            lemma: p,
            family: parsed?.family || "живость",
            valence: parsed?.valence ?? 0.5,
            arousal: 0.3,
            form: p,
            intensity: 1,
          })),
          desires: [],
          pass: false,
          repairedText: repaired,
          neuralDistilled: true,
          engineUsed: engineId,
        };
      }
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
