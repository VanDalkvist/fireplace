import { it, expect } from "vitest";
import { SalonMotionEngine } from "@/canvas/motion-engine";

it("progresses 25% faster per phrase without changing initial heat, speech boost or ceiling", () => {
  const engine = new SalonMotionEngine();
  for (const count of [1, 5, 10, 20, 40, 80, 100]) {
    const previousCurveAt125Percent = (1 - Math.exp(-(count * 1.25) / 28)) * 0.88;
    expect(engine.computeTargetHeat(count, false)).toBeCloseTo(previousCurveAt125Percent, 12);
  }
  expect(engine.computeTargetHeat(0, false)).toBe(0);
  expect(engine.computeTargetHeat(0, true)).toBe(0.12);
  expect(engine.computeTargetHeat(1_000_000, false)).toBe(0.88);
  expect(engine.computeTargetHeat(1_000_000, true)).toBe(1);
});
