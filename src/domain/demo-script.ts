import type { SessionPhase } from "./types";
import type { DemoItem } from "./demo/types";
import { SILENCE_PHRASES } from "./demo/silence-phrases";
import { FEELINGS_PHRASES } from "./demo/feelings-phrases";
import { DESIRES_PHRASES } from "./demo/desires-phrases";
import { COMPLETION_PHRASES } from "./demo/completion-phrases";

export type { DemoItem };

export const DEMO_PHRASES_BY_PHASE: Record<SessionPhase, DemoItem[]> = {
  silence: SILENCE_PHRASES,
  feelings: FEELINGS_PHRASES,
  desires: DESIRES_PHRASES,
  completion: COMPLETION_PHRASES,
};

export const DEMO_PHRASES: DemoItem[] = [
  ...SILENCE_PHRASES,
  ...FEELINGS_PHRASES,
  ...DESIRES_PHRASES,
  ...COMPLETION_PHRASES,
];

export function getDemoPhrasesForPhase(phase: SessionPhase): DemoItem[] {
  return DEMO_PHRASES_BY_PHASE[phase] || DEMO_PHRASES_BY_PHASE.feelings;
}
