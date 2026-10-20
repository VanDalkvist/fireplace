import { describe, it, expect, vi } from "vitest";
import { drawTopologicalIsoclines, drawSeatPresenceRay } from "../src/canvas/field-renderer";

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

  it("draws seat presence ray with dashed stroke", () => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      setLineDash: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    drawSeatPresenceRay(mockCtx, 100, 100, 400, 300, 1.2);

    expect(mockCtx.setLineDash).toHaveBeenCalledWith([3, 5]);
    expect(mockCtx.stroke).toHaveBeenCalled();
  });
});
