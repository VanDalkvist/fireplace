import { describe, it, expect } from "vitest";
import { wrapCanvasText } from "@/canvas/text-wrapper";

describe("wrapCanvasText utility", () => {
  // Approximate character measurement: 12px per char for monospace
  const mockMeasure = (str: string) => str.length * 12;

  it("keeps short phrases on a single line", () => {
    const result = wrapCanvasText("покой и тепло", 420, mockMeasure);
    expect(result.lines).toEqual(["покой и тепло"]);
    expect(result.effectiveWidth).toBe(13 * 12);
  });

  it("wraps long phrases across multiple lines along word boundaries", () => {
    const phrase = "Первый или второй, может первый волшебный, волшебный, Первый Страшно";
    const result = wrapCanvasText(phrase, 360, mockMeasure, 3);
    expect(result.lines.length).toBeGreaterThanOrEqual(2);
    expect(result.lines.length).toBeLessThanOrEqual(3);
    for (const line of result.lines) {
      expect(mockMeasure(line)).toBeLessThanOrEqual(360);
    }
  });

  it("handles very long rambling speech by capping at maxLines with ellipsis", () => {
    const longPhrase =
      "Слушать не слушать, слушать, не слушать, что то он тут обрезает или не то давай его целиком, чтобы он у нас был.";
    const result = wrapCanvasText(longPhrase, 360, mockMeasure, 3);
    expect(result.lines.length).toBeLessThanOrEqual(3);
    expect(result.lines[result.lines.length - 1]).toContain("...");
  });
});
