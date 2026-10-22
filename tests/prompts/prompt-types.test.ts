import { describe, it, expect } from "vitest";
import type { PhasePromptStrategy, PhaseDistillResult } from "@/domain/prompts/types";

describe("PhasePromptStrategy contract", () => {
  it("enforces strategy interface with buildPrompt, parseResponse, and createFallback", () => {
    const mockStrategy: PhasePromptStrategy = {
      phase: "feelings",
      systemPrompt: "System instruction for feelings",
      buildPrompt: (text: string, context?: string[]): string =>
        `User: ${text}, Context: ${context?.length || 0}`,
      parseResponse: (_output: string, original: string): PhaseDistillResult => ({
        feelings: [
          {
            lemma: "спокойствие",
            family: "покой",
            valence: 0.5,
            arousal: 0.2,
            form: "спокойствие",
            intensity: 1,
          },
        ],
        desires: [],
        pass: false,
        repairedText: original,
      }),
      createFallback: (original: string): PhaseDistillResult => ({
        feelings: [
          {
            lemma: original,
            family: "живость",
            valence: 0,
            arousal: 0.3,
            form: original,
            intensity: 1,
          },
        ],
        desires: [],
        pass: false,
        repairedText: original,
      }),
    };

    expect(mockStrategy.phase).toBe("feelings");
    expect(mockStrategy.buildPrompt("привет", ["раньше"])).toContain("Context: 1");
    const parsed = mockStrategy.parseResponse("{}", "привет");
    expect(parsed.feelings).toHaveLength(1);
    expect(parsed.feelings[0].family).toBe("покой");
  });
});
