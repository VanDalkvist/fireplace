import { validateSegments, type PhraseSegmenterPort } from "@/domain/phrase-segmenter";
import { DistillationError } from "@/domain/distillation-error";

export class FallbackPhraseSegmenter implements PhraseSegmenterPort {
  readonly id = "configured-segmentation";
  constructor(private chain: readonly PhraseSegmenterPort[]) {
    if (!chain.length) throw new DistillationError("configuration", "Empty segmenter chain");
  }
  async segment(text: string, maxChars: number): Promise<string[]> {
    const failures: unknown[] = [];
    for (const adapter of this.chain) {
      try {
        const parts = await adapter.segment(text, maxChars);
        validateSegments(text, parts);
        return parts;
      } catch (cause) {
        failures.push(cause);
        console.warn("[FallbackPhraseSegmenter]", { event: "segmentation_failed", adapter: adapter.id, outcome: "failed" });
      }
    }
    throw new DistillationError("unavailable", "Configured segmentation chain exhausted", { cause: new AggregateError(failures) });
  }
}
