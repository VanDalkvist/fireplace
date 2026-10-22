import type { SessionPhase } from "../types";
import type { PhasePromptStrategy } from "./types";
import { FeelingsPromptStrategy } from "./feelings-prompt";
import { DesiresPromptStrategy } from "./desires-prompt";
import { CompletionPromptStrategy } from "./completion-prompt";

export class PromptRegistry {
  private strategies = new Map<SessionPhase, PhasePromptStrategy>();
  private defaultStrategy: PhasePromptStrategy;

  constructor() {
    this.defaultStrategy = new FeelingsPromptStrategy();
    this.register("feelings", this.defaultStrategy);
    this.register("desires", new DesiresPromptStrategy());
    this.register("completion", new CompletionPromptStrategy());
  }

  register(phase: SessionPhase, strategy: PhasePromptStrategy): void {
    this.strategies.set(phase, strategy);
  }

  get(phase: SessionPhase): PhasePromptStrategy {
    return this.strategies.get(phase) || this.defaultStrategy;
  }
}

export const defaultPromptRegistry = new PromptRegistry();
