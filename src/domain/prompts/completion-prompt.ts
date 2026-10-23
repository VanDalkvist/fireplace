import type { SessionPhase } from "../types";
import type { PhasePromptStrategy, PhaseDistillResult } from "./types";
import { parsePhaseResponse } from "./parse-response";

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

Не выдумывай переживания, не анонимизируй имена и не копируй образцы. В phrases запиши только извлечённые из реплики фразы; пустой массив означает отсутствие подходящей реплики.
Формат строго JSON:
{
  "phrases": [],
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
    return parsePhaseResponse(rawLlmOutput, originalText, this.phase);
  }
}
