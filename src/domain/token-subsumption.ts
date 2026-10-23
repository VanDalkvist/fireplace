/**
 * Token Subsumption and Handoff Cleansing
 * Ensures conversational handoff words ("передаю") are cleanly removed,
 * and recent fragmented utterances within 15-20s from the same speaker
 * are subsumed by the complete thought rather than duplicated.
 * Compliance: AP-010, AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import type { SessionPhase } from "./types";
import type { EnrichedDistillationResult } from "./phrase-distiller";
import { isPureFillerPhrase } from "./lexicon-engine";

export interface RecentTokenSnapshot {
  id: string;
  text: string;
  kind: "feeling" | "desire";
  speakerId: number;
  timestamp: number;
}

/**
 * Strips conversational handoff marker "передаю" at the end of phrase
 * or standalone "передаю" / "передаю слово".
 */
export function stripHandoffWord(text: string): string {
  if (!text) return "";
  const cleaned = text
    .replace(/(?:^|[,\s.—-]+)(?:передаю(?:\s+(?:слово|микрофон|дальше))?)[.!?\s]*$/i, "")
    .trim();
  return cleaned.replace(/[,\s.—-]+$/, "").trim();
}

/**
 * Evaluates whether a new phrase extends or subsumes an existing recent token
 * from the same speaker within the designated time window (default 20s).
 */
export function shouldSubsumeToken(
  recent: RecentTokenSnapshot | null,
  newText: string,
  newSpeakerId?: number,
  now = Date.now(),
  maxWindowMs = 20000
): boolean {
  if (!recent) return false;
  // Speaker boundary invariant: different or unspecified speaker cannot subsume
  if (newSpeakerId === undefined || recent.speakerId !== newSpeakerId) return false;
  // Time window guard: only within 20s
  if (now - recent.timestamp > maxWindowMs) return false;

  const oldNorm = recent.text
    .toLowerCase()
    .replace(/[.,!?;:—\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const newNorm = newText
    .toLowerCase()
    .replace(/[.,!?;:—\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!oldNorm || !newNorm) return false;
  if (oldNorm === newNorm) return true;

  // 1. New phrase strictly contains the old fragment
  if (newNorm.includes(oldNorm)) return true;

  // 2. Significant word overlap: >= 60% of meaningful words in old fragment present in new
  const oldWords = oldNorm.split(" ").filter((w) => w.length > 2);
  if (oldWords.length > 0) {
    const matchedCount = oldWords.filter((w) => newNorm.includes(w)).length;
    if (matchedCount / oldWords.length >= 0.6 && newNorm.length >= oldNorm.length) {
      return true;
    }
  }

  return false;
}

export interface DispatchTokenOptions {
  phase: SessionPhase;
  clean: string;
  speakerId: number;
  family?: string;
  valence?: number;
  isDesire?: boolean;
  recent: RecentTokenSnapshot | null;
  onAddFeeling: (text: string, family?: string, valence?: number, speakerId?: number) => void | string;
  onAddDesire: (text: string, speakerId?: number) => void | string;
  onUpdateFeeling?: (id: string, text: string, family?: string, valence?: number) => void;
  onUpdateDesire?: (id: string, text: string) => void;
}

/**
 * Dispatches a token to either update a recent subsumed fragment or create a new token.
 */
export function dispatchSubsumedToken(options: DispatchTokenOptions): RecentTokenSnapshot {
  const {
    phase,
    clean,
    speakerId,
    family = "живость",
    valence = 0,
    isDesire = phase === "desires",
    recent,
    onAddFeeling,
    onAddDesire,
    onUpdateFeeling,
    onUpdateDesire,
  } = options;

  if (shouldSubsumeToken(recent, clean, speakerId) && recent) {
    if (isDesire) {
      onUpdateDesire?.(recent.id, clean);
    } else {
      onUpdateFeeling?.(recent.id, clean, family, valence);
    }
    recent.text = clean;
    return recent;
  }

  let tokenId = "";
  if (isDesire) {
    tokenId = String(onAddDesire(clean, speakerId) || "");
  } else if (phase === "completion") {
    tokenId = String(onAddFeeling(clean, "завершение", 0.5, speakerId) || "");
  } else {
    tokenId = String(onAddFeeling(clean, family, valence, speakerId) || "");
  }

  return {
    id: tokenId,
    text: clean,
    kind: isDesire ? "desire" : "feeling",
    speakerId,
    timestamp: Date.now(),
  };
}

/**
 * Routes neural distillation results to the token subsumption dispatcher.
 */
export function dispatchDistilledResult(
  res: EnrichedDistillationResult,
  settled: string,
  options: Omit<DispatchTokenOptions, "clean" | "family" | "valence" | "isDesire">
): RecentTokenSnapshot | null {
  const { phase, speakerId, recent, onAddFeeling, onAddDesire, onUpdateFeeling, onUpdateDesire } = options;
  let currentRecent = recent;
  let matched = false;

  for (const f of res.feelings) {
    const p = stripHandoffWord(f.form || f.lemma || "");
    if (p && !isPureFillerPhrase(p)) {
      currentRecent = dispatchSubsumedToken({
        phase,
        clean: p,
        speakerId,
        family: f.family,
        valence: f.valence,
        isDesire: false,
        recent: currentRecent,
        onAddFeeling,
        onAddDesire,
        onUpdateFeeling,
        onUpdateDesire,
      });
      matched = true;
    }
  }

  for (const d of res.desires) {
    const p = stripHandoffWord(d.text || "");
    if (p && !isPureFillerPhrase(p)) {
      currentRecent = dispatchSubsumedToken({
        phase,
        clean: p,
        speakerId,
        isDesire: true,
        recent: currentRecent,
        onAddFeeling,
        onAddDesire,
        onUpdateFeeling,
        onUpdateDesire,
      });
      matched = true;
    }
  }

  if (!matched) {
    const clean = stripHandoffWord(res.fallbackText || settled || "");
    if (clean && !isPureFillerPhrase(clean)) {
      currentRecent = dispatchSubsumedToken({
        phase,
        clean,
        speakerId,
        family: phase === "completion" ? "завершение" : "живость",
        valence: phase === "completion" ? 0.5 : 0,
        isDesire: res.isDesirePhrase || phase === "desires",
        recent: currentRecent,
        onAddFeeling,
        onAddDesire,
        onUpdateFeeling,
        onUpdateDesire,
      });
    }
  }

  return currentRecent;
}
