import type { LlmDistillerPort } from "@/domain/distiller-types";
import type { PhraseSegmenterPort } from "@/domain/phrase-segmenter";
import { DistillationError } from "@/domain/distillation-error";

export class OllamaPhraseSegmenter implements PhraseSegmenterPort {
  readonly id = "ollama";
  constructor(private model: LlmDistillerPort) {}
  async segment(text: string, maxChars: number): Promise<string[]> {
    const result = await this.model.complete({
      systemPrompt: "Раздели текст на последовательные смысловые фрагменты. Не сокращай, не переставляй и не изменяй ни одного слова или знака. Вместе фрагменты обязаны дословно восстановить исходный текст. Ответ только JSON с массивом строк phrases. Не добавляй примеры, вступления, эмоции или выводы.",
      prompt: JSON.stringify({ text, maxChars }), jsonFormat: true, temperature: 0, maxTokens: 1500,
    }, 4500);
    if (!result) throw new DistillationError("unavailable", "Segmenter model unavailable");
    let data: unknown;
    try { data = JSON.parse(result.content); }
    catch (cause) { throw new DistillationError("invalid-output", "Invalid segmentation JSON", { cause }); }
    if (!data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>).phrases)) {
      throw new DistillationError("invalid-output", "Missing segmentation array");
    }
    return (data as { phrases: string[] }).phrases;
  }
}
