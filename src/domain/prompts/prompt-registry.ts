import type { SessionPhase } from "../types";
import type { PhasePromptStrategy } from "./types";
import { DistillationError } from "../distillation-error";
import { FeelingsPromptStrategy } from "./feelings-prompt";
import { DesiresPromptStrategy } from "./desires-prompt";
import { CompletionPromptStrategy } from "./completion-prompt";

export class PromptRegistry {
  private strategies = new Map<SessionPhase, PhasePromptStrategy>();
  constructor() {
    const feelings = new FeelingsPromptStrategy();
    this.register("silence", feelings);
    this.register("feelings", feelings);
    this.register("desires", new DesiresPromptStrategy());
    this.register("completion", new CompletionPromptStrategy());
  }

  register(phase: SessionPhase, strategy: PhasePromptStrategy): void {
    this.strategies.set(phase, strategy);
  }

  get(phase: SessionPhase): PhasePromptStrategy {
    const strategy = this.strategies.get(phase);
    if (!strategy) throw new DistillationError("configuration", `Prompt phase '${phase}' is not registered`);
    return strategy;
  }
}

export const defaultPromptRegistry = new PromptRegistry();
