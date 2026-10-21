import { describe, it, expect } from "vitest";
import { separateBoxes } from "../src/canvas/collision-layout";

describe("Collision Layout", () => {
  it("pushes overlapping bounding boxes apart", () => {
    const a = { x: 100, y: 100, w: 80, h: 24 };
    const b = { x: 105, y: 100, w: 80, h: 24 };

    separateBoxes(a, b, 10);

    // Boxes should have moved apart horizontally
    expect(a.x).toBeLessThan(100);
    expect(b.x).toBeGreaterThan(105);
  });

  it("does not alter non-overlapping boxes", () => {
    const a = { x: 50, y: 50, w: 40, h: 20 };
    const b = { x: 200, y: 200, w: 40, h: 20 };

    separateBoxes(a, b, 10);

    expect(a.x).toBe(50);
    expect(b.x).toBe(200);
  });
});
