import { describe, it, expect } from "vitest";
import { wrapCanvasText } from "@/canvas/text-wrapper";

const measure = (text: string) => Array.from(text).length * 12;

describe("lossless Canvas wrapping", () => {
  it("keeps a short phrase on one line", () => {
    const result = wrapCanvasText("покой и тепло", 640, measure);
    expect(result.lines).toEqual(["покой и тепло"]);
    expect(result.effectiveWidth).toBe(measure("покой и тепло"));
  });

  it("shows all text in blocks of at most five lines without appending ellipsis", () => {
    const text = Array.from({ length: 90 }, (_, i) => `мысль${i}`).join(" ") + " последний смысл";
    const result = wrapCanvasText(text, 240, measure, 5);
    expect(result.blocks.length).toBeGreaterThan(1);
    expect(result.blocks.map(block => block.text).join("")).toBe(text);
    expect(result.blocks.every(block => block.lines.length <= 5)).toBe(true);
    expect(result.lines.at(-1)).toContain("смысл");
    expect(result.lines.join("")).not.toContain("...");
    expect(result.lines.every(line => measure(line) <= 240)).toBe(true);
  });

  it("keeps punctuation and literal ellipses supplied by the speaker", () => {
    const text = "Я... правда, хочу тишины. И побыть рядом — без слов!";
    const result = wrapCanvasText(text, 120, measure, 2);
    expect(result.blocks.map(block => block.text).join("")).toBe(text);
    expect(result.blocks.every(block => block.lines.length <= 2)).toBe(true);
  });

  it("does not lose Unicode or a long unbroken word", () => {
    const text = "👨‍👩‍👧‍👦 " + "оченьдлинноеслово".repeat(8) + " конец";
    const result = wrapCanvasText(text, 120, measure, 5);
    expect(result.blocks.map(block => block.text).join("")).toBe(text);
    expect(result.lines.some(line => line.includes("👨‍👩‍👧‍👦"))).toBe(true);
    expect(result.lines.every(line => !line.includes("�"))).toBe(true);
  });

  it("returns no blocks for an empty phrase and rejects invalid budgets", () => {
    expect(wrapCanvasText("  ", 640, measure).blocks).toEqual([]);
    expect(() => wrapCanvasText("текст", 0, measure)).toThrow();
    expect(() => wrapCanvasText("текст", 640, measure, 0)).toThrow();
  });
});
