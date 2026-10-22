import { distillSpokenPhrase, isPureFillerPhrase, type DistillationResult, type LexiconIndex } from "./lexicon-engine";
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
  full_thought?: string;
  phrase?: string;
  phrases?: string[];
  family?: string;
  valence?: number;
  kind?: "feeling" | "desire" | "pass";
}

const IT_TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/(^|[\s.,;:!?"'()])бэтенд([а-яё]*)(?=[\s.,;:!?"'()]|$)/gi, "$1бэкенд$2"],
  [/(^|[\s.,;:!?"'()])пошер([а-яё]*)(?=[\s.,;:!?"'()]|$)/gi, "$1пошар$2"],
  [/(^|[\s.,;:!?"'()])сценарий вещи(?=[\s.,;:!?"'()]|$)/gi, "$1сценарий фичи"],
  [/(^|[\s.,;:!?"'()])нетворкинг пэйс(?=[\s.,;:!?"'()]|$)/gi, "$1Networking Space"],
  [/(^|[\s.,;:!?"'()])в рамках спейс(?=[\s.,;:!?"'()]|$)/gi, "$1в рамках Space"],
];

export function normalizeItTerms(text: string): string {
  let res = text;
  for (const [pattern, repl] of IT_TERM_REPLACEMENTS) res = res.replace(pattern, repl);
  return res;
}

const MEETING_NOISE_PATTERNS = [
  /^(?:ты\s+)?слышишь(?:\s+меня)?\??$/i,
  /^(?:меня|вас)\s+слышно\??$/i,
  /^смотр(?:ел|ишь)\??$/i,
  /^(?:да-да|ага|угу|ну\s+да)\.?$/i,
  /^(?:денис|виктор|саша|маша|дима)\s+дополни(?:\s+что[- ]?нибудь)?$/i,
];

export function isMeetingOperationalNoise(text: string): boolean {
  return MEETING_NOISE_PATTERNS.some((p) => p.test(text.trim()));
}

export function isDanglingFragment(text: string): boolean {
  return /(?:\s|^)(?:для|как|на|в|с|к|по|от|о|об|обо|за|из|под|над|при|без|про|что|чтобы|если|или|но|а|и)\s*$/i.test(text.trim());
}

export async function distillWithNeuralFallback(
  rawText: string,
  idx: LexiconIndex,
  options: NeuralDistillerOptions = {},
  recentContext: string[] = []
): Promise<EnrichedDistillationResult> {
  const normalized = normalizeItTerms(rawText.trim());
  const lower = normalized.toLowerCase();

  // Fast-track explicit pass
  if (lower === "пас" || lower === "я пас" || lower === "пас сегодня") {
    return { feelings: [], desires: [], pass: true, neuralDistilled: false, engineUsed: "qwen2.5:1.5b" };
  }

  // Fast-track pure conversational fillers or meeting operational noise
  if (isPureFillerPhrase(normalized) || isMeetingOperationalNoise(normalized)) {
    return { feelings: [], desires: [], pass: false, repairedText: normalized, neuralDistilled: false, engineUsed: "lexicon-fallback" };
  }

  const ollamaUrl = options.ollamaUrl || "http://127.0.0.1:11434";
  const model = options.model || "qwen2.5:1.5b";
  const timeoutMs = options.timeoutMs ?? 2000;

  try {
    const client = new OllamaClient(ollamaUrl);
    const contextLines = recentContext.length > 0
      ? `Контекст реплик:\n${recentContext.map((c) => `- "${c}"`).join("\n")}\n\n`
      : "";

    const prompt = `Ты — чуткий слушатель в созерцательном круге чувств у костра.
Участник делится переживаниями. Собери из его спонтанной речи емкую, живую мысль для круга.
ПРАВИЛА:
1. Убирай слова-паразиты («ну как бы», «в общем», «типа», «так сказать», «короче»), заикания и повторы.
2. Сохраняй живой голос и суть переживания (без сухого канцелярита).
3. Если мыслей несколько — выдели phrases: ["первая мысль", "вторая мысль"].
4. Фоновый шум или обрывки («меня слышно?», «смотри») -> верни phrase: "".
ПРИМЕРЫ:
"ну мы вчера долго сидели и я прям почувствовал такую усталость" -> {"full_thought": "почувствовал сильную усталость после долгого дня", "phrase": "сильная усталость", "family": "усталость", "valence": -0.4}
"хочется просто выдохнуть и побыть в тишине" -> {"full_thought": "хочется просто выдохнуть и побыть в тишине", "phrase": "выдохнуть и побыть в тишине", "family": "покой", "valence": 0.8}
"мне сейчас немного тревожно, но чувствую тепло круга" -> {"full_thought": "чувствую тревогу, но ощущаю тепло круга", "phrases": ["немного тревожно", "тепло круга"], "family": "тепло", "valence": 0.5}
"алло раз два слышно меня да" -> {"phrase": "", "family": "покой", "valence": 0.0}

${contextLines}Высказывание: "${normalized}"
Выведи строго JSON:
- full_thought (связная очищенная мысль целиком)
- phrase (емкая мысль 3–7 слов или "" если мусор)
- phrases (массив строк, если мыслей несколько)
- family (покой, тепло, радость, открытость, ясность, тревога, усталость, грусть)
- valence (-1.0..1.0)
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
      const repaired = (parsed.full_thought || parsed.repaired_text || "").trim() || normalized;

      if (!phraseClean && !parsed.phrases?.length && (isPureFillerPhrase(normalized) || isMeetingOperationalNoise(normalized) || isDanglingFragment(normalized))) {
        return { feelings: [], desires: [], pass: false, repairedText: repaired, neuralDistilled: true, engineUsed: model as "qwen2.5:1.5b" };
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

      const rawPhrases = Array.isArray(parsed.phrases) && parsed.phrases.length > 0
        ? parsed.phrases.map((p) => p.trim()).filter((p) => p.length > 0 && !isPureFillerPhrase(p))
        : [];
      const phraseList = rawPhrases.length > 0 ? rawPhrases : (singlePhrase ? [singlePhrase] : []);

      if (phraseList.length > 0) {
        const kind = parsed.kind || "feeling";
        if (kind === "pass") {
          return { feelings: [], desires: [], pass: true, repairedText: repaired, neuralDistilled: true, engineUsed: model as "qwen2.5:1.5b" };
        }
        if (kind === "desire") {
          return {
            feelings: [],
            desires: phraseList.map((p) => ({ text: p, object: p, who: null })),
            pass: false,
            isDesirePhrase: true,
            repairedText: repaired,
            neuralDistilled: true,
            engineUsed: model as "qwen2.5:1.5b",
          };
        }
        return {
          feelings: phraseList.map((p) => ({
            lemma: p,
            family: parsed.family || "живость",
            valence: parsed.valence ?? 0.5,
            arousal: 0.3,
            form: p,
            intensity: 1,
          })),
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
