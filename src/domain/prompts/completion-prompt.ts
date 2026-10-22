import type { SessionPhase } from "../types";
import type { PhasePromptStrategy, PhaseDistillResult, PromptDistillPayload } from "./types";

export class CompletionPromptStrategy implements PhasePromptStrategy {
  readonly phase: SessionPhase = "completion";

  readonly systemPrompt = `Ты — чуткий слушатель на завершающем круге чекаута и интеграции у костра («Что было важным? Что я забираю с собой?»).
Участник подводит итоги встречи и делится своим сухим остатком, инсайтом или чувством благодарности.
Твоя задача — услышать самое главное зерно, инсайт или ощущение, которое человек уносит с собой из круга, и извлечь его ЦЕЛОСТНОЙ фразой.

ПРАВИЛА:
1. ЗЕРНО ИНТЕГРАЦИИ: Извлеки ОДНУ цельную фразу того, что участник забирает с собой («забираю ощущение спокойствия», «понял, что я не один», «уношу тепло круга»).
2. ПОДЛИННЫЙ ЯЗЫК: Сохраняй подлинные слова человека. Отрезай дежурные вступления («в общем, как-то так...»).
3. Если участник благодарит круг или выражает тепло — зафиксируй это как фразу интеграции.
4. Если в реплике нет итогов или инсайтов — верни phrases: [].

Формат строго JSON:
{
  "phrases": ["забираю тепло и понимание, что я не один"],
  "family": "завершение|благодарность|покой|тепло",
  "valence": число от 0.0 до 1.0,
  "kind": "completion"
}`;

  buildPrompt(rawText: string, recentContext: string[] = []): string {
    const contextLines = recentContext.length > 0
      ? `Контекст реплик:\n${recentContext.map((c) => `- "${c}"`).join("\n")}\n\n`
      : "";
    return `${contextLines}Реплика участника о завершении: "${rawText.trim()}"`;
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

    return {
      feelings: phrases.map((p) => ({
        lemma: p,
        family: parsed?.family || "завершение",
        valence: parsed?.valence ?? 0.5,
        arousal: 0.2,
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
        family: "завершение",
        valence: 0.3,
        arousal: 0.2,
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
