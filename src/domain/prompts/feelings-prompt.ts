import type { SessionPhase } from "../types";
import type { PhasePromptStrategy, PhaseDistillResult } from "./types";
import { parsePhaseResponse } from "./parse-response";

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

Не выдумывай переживания, не анонимизируй имена и не копируй образцы. В phrases запиши только извлечённые из реплики фразы; пустой массив означает отсутствие подходящей реплики.
Формат строго JSON:
{
  "phrases": [],
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
    return parsePhaseResponse(rawLlmOutput, originalText, this.phase);
  }
}
