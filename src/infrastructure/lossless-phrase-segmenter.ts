import { normalizePhrase, type PhraseSegmenterPort } from "@/domain/phrase-segmenter";

/** Explicit formatting plugin. It never classifies, invents, or summarizes a phrase. */
export class LosslessPhraseSegmenter implements PhraseSegmenterPort {
  readonly id = "lossless";
  async segment(source: string, maxChars: number): Promise<string[]> {
    if (maxChars < 1) throw new Error("Invalid segment size");
    const words = normalizePhrase(source).split(" ");
    const parts: string[] = [];
    let current = "";
    for (const word of words) {
      if (current && current.length + word.length + 1 > maxChars) { parts.push(current); current = ""; }
      current = current ? current + " " + word : word;
    }
    if (current) parts.push(current);
    return parts;
  }
}
