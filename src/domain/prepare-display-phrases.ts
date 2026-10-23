import type { EnrichedDistillationResult } from "./phrase-distiller";
import type { PhraseSegmenterPort } from "./phrase-segmenter";

export async function prepareDisplayPhrases(result: EnrichedDistillationResult, segmenter: PhraseSegmenterPort, budget = 260): Promise<EnrichedDistillationResult> {
  const feelings = [];
  for (const feeling of result.feelings) {
    const text = feeling.form ?? feeling.lemma;
    const parts = text.length > budget ? await segmenter.segment(text, budget) : [text];
    feelings.push(...parts.map(part => ({ ...feeling, form: part, lemma: part })));
  }
  const desires = [];
  for (const desire of result.desires) {
    const parts = desire.text.length > budget ? await segmenter.segment(desire.text, budget) : [desire.text];
    desires.push(...parts.map(text => ({ ...desire, text, object: text })));
  }
  return { ...result, feelings, desires };
}
