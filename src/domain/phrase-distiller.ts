import { isPureFillerPhrase, type DistillationResult } from "./lexicon-engine";
import type { LlmDistillerPort } from "./distiller-types";
import { DistillationError } from "./distillation-error";
import { defaultPromptRegistry } from "./prompts/prompt-registry";
import type { SessionPhase } from "./types";

export interface NeuralDistillerOptions {
  model?: string;
  timeoutMs?: number;
  engine?: string;
  distillerPort?: LlmDistillerPort;
  phase?: SessionPhase;
}
export interface EnrichedDistillationResult extends DistillationResult {
  repairedText?: string;
  neuralDistilled?: boolean;
  engineUsed: string;
  modelUsed?: string;
}

export async function distillWithNeuralFallback(rawText: string, options: NeuralDistillerOptions = {}, recentContext: string[] = []): Promise<EnrichedDistillationResult> {
  const source = rawText.trim();
  if (["пас", "я пас", "пас сегодня"].includes(source.toLowerCase())) {
    return { feelings: [], desires: [], pass: true, neuralDistilled: false, engineUsed: "pass" };
  }
  if (!source || isPureFillerPhrase(source)) {
    return { feelings: [], desires: [], pass: false, repairedText: source, neuralDistilled: false, engineUsed: "suppressed" };
  }
  const port = options.distillerPort;
  if (!port) throw new DistillationError("configuration", "No distiller adapter was supplied");
  const strategy = defaultPromptRegistry.get(options.phase ?? "feelings");
  const validate = (content: string) => { strategy.parseResponse(content, source); };
  const data = await port.complete({
    prompt: strategy.buildPrompt(source, recentContext), systemPrompt: strategy.systemPrompt,
    model: options.model, jsonFormat: true, temperature: 0.1, maxTokens: 1000,
  }, options.timeoutMs, validate);
  if (!data?.content) throw new DistillationError("unavailable", "Distiller returned no content");
  return {
    ...strategy.parseResponse(data.content, source), neuralDistilled: true,
    engineUsed: data.adapterId ?? port.id, modelUsed: data.modelUsed,
  };
}
