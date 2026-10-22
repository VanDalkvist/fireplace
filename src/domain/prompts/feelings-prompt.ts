import type { SessionPhase } from "../types";
import type { PhasePromptStrategy, PhaseDistillResult, PromptDistillPayload } from "./types";

export class FeelingsPromptStrategy implements PhasePromptStrategy {
  readonly phase: SessionPhase = "feelings";

  readonly systemPrompt = `Ты — чуткий слушатель в созерцательном круге чувств у костра.
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

  buildPrompt(rawText: string, recentContext: string[] = []): string {
    const contextLines = recentContext.length > 0
      ? `Контекст реплик:\n${recentContext.map((c) => `- "${c}"`).join("\n")}\n\n`
      : "";
    return `${contextLines}Реплика: "${rawText.trim()}"`;
  }

  parseResponse(rawLlmOutput: string, originalText: string): PhaseDistillResult {
    const parsed = this.parseJson(rawLlmOutput);
    const phrases = this.extractPhrases(parsed);

    if (parsed?.kind === "pass") {
      return { feelings: [], desires: [], pass: true, repairedText: originalText };
    }

    if (phrases.length === 0) {
      return { feelings: [], desires: [], pass: false, repairedText: originalText };
    }

    if (parsed?.kind === "desire") {
      return {
        feelings: [],
        desires: phrases.map((p) => ({ text: p, object: p, who: null })),
        pass: false,
        isDesirePhrase: true,
        repairedText: originalText,
      };
    }

    return {
      feelings: phrases.map((p) => ({
        lemma: p,
        family: parsed?.family || "живость",
        valence: parsed?.valence ?? 0.0,
        arousal: 0.3,
        form: p,
        intensity: 1,
      })),
      desires: [],
      pass: false,
      repairedText: originalText,
    };
  }

  createFallback(rawText: string): PhaseDistillResult {
    const clean = rawText.trim();
    return {
      feelings: [{
        lemma: clean,
        family: "живость",
        valence: 0,
        arousal: 0.3,
        form: clean,
        intensity: 1,
      }],
      desires: [],
      pass: false,
      repairedText: clean,
      fallbackText: clean,
    };
  }

  private parseJson(raw: string): PromptDistillPayload | null {
    try {
      const clean = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      return JSON.parse(clean) as PromptDistillPayload;
    } catch {
      return null;
    }
  }

  private extractPhrases(parsed: PromptDistillPayload | null): string[] {
    const out: string[] = [];
    if (Array.isArray(parsed?.phrases)) {
      for (const p of parsed.phrases) {
        const s = String(p).trim();
        if (s) out.push(s);
      }
    } else if (parsed?.phrase && String(parsed.phrase).trim()) {
      out.push(String(parsed.phrase).trim());
    }
    return out;
  }
}
