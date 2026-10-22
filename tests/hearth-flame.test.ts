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
      flame.render(mockCtx, 500, 300, 1500, 0.0);
    }).not.toThrow();

    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.restore).toHaveBeenCalled();
    expect(mockCtx.beginPath).toHaveBeenCalled();
  });

  it('widens the ambient ground light pool as heat increases from words', () => {
    const flame = new HearthFlameSimulator();
    const recordedRadii: number[] = [];

    const createCtx = () => ({
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
      createRadialGradient: vi.fn((_cx, _cy, _r0, _fx, _fy, r1) => {
        recordedRadii.push(r1);
        return { addColorStop: vi.fn() };
      }),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D);

    // Render with 0 heat (empty circle)
    flame.render(createCtx(), 500, 300, 1000, 0.0);
    const coolRadius = recordedRadii[0];

    // Render with 1.0 heat (hot circle with many words)
    flame.render(createCtx(), 500, 300, 1000, 1.0);
    const hotRadius = recordedRadii[1];

    expect(coolRadius).toBeDefined();
    expect(hotRadius).toBeDefined();
    expect(hotRadius).toBeGreaterThan(coolRadius);
  });
});
