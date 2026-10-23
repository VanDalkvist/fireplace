import type { SessionPhase } from "../types";
import type { PhasePromptStrategy, PhaseDistillResult } from "./types";
import { parsePhaseResponse } from "./parse-response";

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

Не выдумывай переживания, не анонимизируй имена и не копируй образцы. В phrases запиши только извлечённые из реплики фразы; пустой массив означает отсутствие подходящей реплики.
Формат строго JSON:
{
  "phrases": [],
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
    return parsePhaseResponse(rawLlmOutput, originalText, this.phase);
  }
}
