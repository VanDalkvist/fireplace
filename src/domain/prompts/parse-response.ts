import { DistillationError } from "../distillation-error";
import type { SessionPhase } from "../types";
import type { PhaseDistillResult } from "./types";

export function parsePhaseResponse(raw: string, source: string, phase: SessionPhase): PhaseDistillResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\x60\x60\x60json\s*/i, "").replace(/\x60\x60\x60\s*$/i, "").trim());
  } catch (cause) {
    throw new DistillationError("invalid-output", "Model returned invalid JSON", { cause });
  }
  if (!parsed || typeof parsed !== "object") throw new DistillationError("invalid-output", "Missing semantic object");
  const data = parsed as Record<string, unknown>;
  if (data.kind !== undefined && !["feeling", "desire", "completion", "pass"].includes(String(data.kind))) throw new DistillationError("invalid-output", "Unknown semantic kind");
  if (data.kind === "pass") return { feelings: [], desires: [], pass: true, repairedText: source };
  const phrases = Array.isArray(data.phrases) ? data.phrases : typeof data.phrase === "string" ? [data.phrase] : undefined;
  if (!phrases || !phrases.every(p => typeof p === "string")) throw new DistillationError("invalid-output", "Missing phrase array");
  const clean = (phrases as string[]).map(p => p.trim()).filter(Boolean);
  if (clean.some(text => [...text.matchAll(/\[[A-Z_]{2,}\]/g)].some(match => !source.includes(match[0])))) throw new DistillationError("invalid-output", "Model inserted a redaction placeholder");
  if (!clean.length) return { feelings: [], desires: [], pass: false, repairedText: source };
  if (typeof data.family !== "string" || !data.family.trim() || typeof data.valence !== "number" || !Number.isFinite(data.valence) || Math.abs(data.valence) > 1) {
    throw new DistillationError("invalid-output", "Missing or invalid semantic metadata");
  }
  if (phase === "desires" || data.kind === "desire") {
    return { feelings: [], desires: clean.map(text => ({ text, object: text, who: null })), pass: false, isDesirePhrase: true, repairedText: source };
  }
  const family = data.family, valence = data.valence;
  return {
    feelings: clean.map(text => ({ lemma: text, form: text, family, valence, arousal: phase === "completion" ? 0.2 : 0.3, intensity: 1 })),
    desires: [], pass: false, repairedText: source,
  };
}
