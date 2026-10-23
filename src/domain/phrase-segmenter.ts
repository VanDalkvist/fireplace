import { DistillationError } from "./distillation-error";
export interface PhraseSegmenterPort {
  readonly id: string;
  segment(text: string, maxChars: number): Promise<string[]>;
}
export function normalizePhrase(text: string): string { return text.trim().replace(/\s+/g, " "); }
export function validateSegments(source: string, parts: unknown): asserts parts is string[] {
  if (!Array.isArray(parts) || !parts.length || !parts.every(part => typeof part === "string" && part.trim()) ||
      normalizePhrase(parts.join(" ")) !== normalizePhrase(source)) {
    throw new DistillationError("invalid-output", "Segmentation changed or omitted source content");
  }
}
