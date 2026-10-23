import type { SessionPhase } from "../types";
import type { ExtractedFeeling, ExtractedDesire } from "../lexicon-engine";

export interface PromptDistillPayload {
  phrases?: string[];
  phrase?: string;
  family?: string;
  valence?: number;
  kind?: "feeling" | "desire" | "completion" | "pass";
}

export interface PhaseDistillResult {
  feelings: ExtractedFeeling[];
  desires: ExtractedDesire[];
  pass: boolean;
  isDesirePhrase?: boolean;
  repairedText?: string;
}

export interface PhasePromptStrategy {
  readonly phase: SessionPhase;
  readonly systemPrompt: string;
  buildPrompt(rawText: string, recentContext?: string[]): string;
  parseResponse(rawLlmOutput: string, originalText: string): PhaseDistillResult;
}
