import { describe, expect, it } from "vitest";
import { FeelingsPromptStrategy } from "../../src/domain/prompts/feelings-prompt";
import { DesiresPromptStrategy } from "../../src/domain/prompts/desires-prompt";
import { CompletionPromptStrategy } from "../../src/domain/prompts/completion-prompt";

const strategies = [new FeelingsPromptStrategy(), new DesiresPromptStrategy(), new CompletionPromptStrategy()];
describe("semantic output boundary", () => {
  for (const strategy of strategies) {
    it(`${strategy.phase}: rejects malformed or missing content instead of substituting source text`, () => {
      for (const output of ["not json", "{}", '{"phrases":[42]}', '{"phrases":["текст"]}']) {
        expect(() => strategy.parseResponse(output, "исходная реплика")).toThrow();
      }
    });
    it(`${strategy.phase}: respects intentional suppression`, () => {
      expect(strategy.parseResponse('{"phrases":[]}', "проверка связи")).toMatchObject({ feelings: [], desires: [], pass: false });
    });
  }
});
