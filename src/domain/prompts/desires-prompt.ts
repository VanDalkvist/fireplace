import type { SessionPhase } from "../types";
import type { PhasePromptStrategy, PhaseDistillResult, PromptDistillPayload } from "./types";

export class DesiresPromptStrategy implements PhasePromptStrategy {
  readonly phase: SessionPhase = "desires";

  readonly systemPrompt = `Ты — чуткий слушатель в круге созерцания и желаний у костра.
Участник делится тем, чего ему хочется прямо сейчас. В спонтанной речи люди часто говорят через сомнения, усталость, обстоятельства или бытовые обязательства («надо бы...», «придётся...»).
Твоя задача — услышать за рассказом живое желание, потребность или импульс души («хочу... / хочется...») и извлечь его ЦЕЛОСТНОЙ фразой от первого лица.

ПРАВИЛА:
1. ЦЕЛОСТНОСТЬ ЖЕЛАНИЯ: Извлеки ОДНУ цельную фразу того, чего по-настоящему хочется человеку. Сохрани форму от первого лица («хочется...», «хочу...»).
2. ПОДЛИННЫЙ ЯЗЫК: Сохраняй интонацию и лексику спикера, убирая оправдания, внешние обстоятельства и рассуждения.
3. Если человек выражает намерение или потребность косвенно («надо бы выспаться», «голова гудит, только бы тишины»), переведи это в форму прямого желания («хочется выспаться», «хочется побыть в тишине»).
4. Если в реплике нет желаний и импульсов (только сухие факты, погода, технические реплики) — верни phrases: [].

Формат строго JSON:
{
  "phrases": ["хочется выдохнуть и побыть в тишине"],
  "family": "желание",
  "valence": число от -0.5 до 1.0,
  "kind": "desire"
}`;

  buildPrompt(rawText: string, recentContext: string[] = []): string {
    const contextLines = recentContext.length > 0
      ? `Контекст реплик:\n${recentContext.map((c) => `- "${c}"`).join("\n")}\n\n`
      : "";
    return `${contextLines}Реплика участника о желаниях: "${rawText.trim()}"`;
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
      feelings: [],
      desires: phrases.map((p) => ({
        text: p,
        object: p,
        who: null,
      })),
      pass: false,
      isDesirePhrase: true,
      repairedText: originalText,
    };
  }

  createFallback(rawText: string): PhaseDistillResult {
    const clean = rawText.trim();
    return {
      feelings: [],
      desires: [{
        text: clean,
        object: clean,
        who: null,
      }],
      pass: false,
      isDesirePhrase: true,
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
