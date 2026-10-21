import { describe, it, expect, vi } from 'vitest';
import { HearthFlameSimulator } from '../src/canvas/hearth-flame';

describe('HearthFlameSimulator', () => {
  it('renders multi-tongue flame and embers without error', () => {
    const flame = new HearthFlameSimulator();

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D;

    expect(() => {
      flame.render(mockCtx, 500, 300, 1500);
    }).not.toThrow();

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
  });
});
