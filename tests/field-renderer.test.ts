import { describe, it, expect, vi } from "vitest";
import { drawTopologicalIsoclines, drawTransientSpark } from "../src/canvas/field-renderer";

describe("Field Renderer", () => {
  it("draws topological isoclines with warping", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    drawTopologicalIsoclines(
      mockCtx,
      400,
      300,
      [{ x: 380, y: 290, weight: 1.4 }],
      1200
    );

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it("animates transient flight spark and expires after duration", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: "",
      shadowColor: "",
      shadowBlur: 0,
    } as unknown as CanvasRenderingContext2D;

    const spark = {
      seatX: 100,
      seatY: 100,
      targetX: 400,
      targetY: 300,
      bornTime: 1000,
      durationMs: 1400,
    };

    const alive = drawTransientSpark(mockCtx, spark, 1500);
    expect(alive).toBe(true);
    expect(mockCtx.arc).toHaveBeenCalled();

    const expired = drawTransientSpark(mockCtx, spark, 2600);
    expect(expired).toBe(false);
  });
});
