import { describe, it, expect, vi } from "vitest";
import { HearthFlameSimulator } from "../src/canvas/hearth-flame";

describe("HearthFlameSimulator Radial Expansion & Invariants", () => {
  it("expands flame tongue radius with heat while strictly staying within the stone ring boundary", () => {
    const flame = new HearthFlameSimulator();
    const cx = 500;
    const cy = 300;

    const captureTongues = (heat: number) => {
      const tongueXCoords: number[] = [];

      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn((cp1x: number, _2: number, _3: number, _4: number, endX: number) => {
          tongueXCoords.push(cp1x, endX);
        }),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        fillStyle: "",
        strokeStyle: "",
        lineWidth: 1,
        lineCap: "round",
        globalCompositeOperation: "source-over",
      } as unknown as CanvasRenderingContext2D;

      flame.render(mockCtx, cx, cy, 1000, heat);
      const minX = Math.min(...tongueXCoords);
      const maxX = Math.max(...tongueXCoords);
      const span = maxX - minX;
      const maxDistFromCenter = Math.max(Math.abs(minX - cx), Math.abs(maxX - cx));
      return { span, maxDistFromCenter };
    };

    const cold = captureTongues(0.0);
    const hot = captureTongues(1.0);

    // 1. Flame footprint expands significantly in radius as heat accumulates
    expect(hot.span).toBeGreaterThan(cold.span * 1.4);

    // 2. Strict invariant: even at maximum heat, flame strictly remains within stone ring (< 115px vs stones >= 121px)
    expect(hot.maxDistFromCenter).toBeLessThan(115);
  });

  it("preserves physical hearth stone geometry regardless of heat level", () => {
    const flame = new HearthFlameSimulator();
    const cx = 500;
    const cy = 300;

    const coldStones: number[] = [];
    const hotStones: number[] = [];

    const createCtx = (sink: number[]) => ({
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn((_cx, _cy, rx) => { sink.push(rx); }),
      fill: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineCap: "round",
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D);

    flame.render(createCtx(coldStones), cx, cy, 1000, 0.0);
    flame.render(createCtx(hotStones), cx, cy, 1000, 1.0);

    // Stone facets captured by ellipse calls must have identical dimensions between cold and hot
    expect(coldStones.slice(0, 16)).toEqual(hotStones.slice(0, 16));
  });
});
