import { describe, it, expect } from "vitest";
import { PromptRegistry, defaultPromptRegistry } from "@/domain/prompts/prompt-registry";
import { FeelingsPromptStrategy } from "@/domain/prompts/feelings-prompt";
import { DesiresPromptStrategy } from "@/domain/prompts/desires-prompt";
import { CompletionPromptStrategy } from "@/domain/prompts/completion-prompt";
import type { SessionPhase } from "@/domain/types";

describe("PromptRegistry", () => {
  it("resolves registered strategies for each phase", () => {
    const registry = new PromptRegistry();
    expect(registry.get("feelings")).toBeInstanceOf(FeelingsPromptStrategy);
    expect(registry.get("desires")).toBeInstanceOf(DesiresPromptStrategy);
    expect(registry.get("completion")).toBeInstanceOf(CompletionPromptStrategy);
  });

  it("defaults to feelings strategy on silence or unknown phase", () => {
    const registry = new PromptRegistry();
    expect(registry.get("silence")).toBeInstanceOf(FeelingsPromptStrategy);
    expect(registry.get("unknown" as SessionPhase)).toBeInstanceOf(FeelingsPromptStrategy);
  });

  it("exports configured defaultPromptRegistry singleton", () => {
    expect(defaultPromptRegistry.get("desires")).toBeInstanceOf(DesiresPromptStrategy);
  });

  it("allows registering custom strategy", () => {
    const registry = new PromptRegistry();
    const custom = new DesiresPromptStrategy();
    registry.register("feelings", custom);
    expect(registry.get("feelings")).toBe(custom);
  });
});
