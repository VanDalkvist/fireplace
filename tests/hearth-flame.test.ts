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
    const coolRadii: number[] = [];
    const hotRadii: number[] = [];

    const createCtx = (sink: number[]) => ({
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
        sink.push(r1);
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
    flame.render(createCtx(coolRadii), 500, 300, 1000, 0.0);
    const coolRadius = coolRadii[0];

    // Render with 1.0 heat (hot circle with many words)
    flame.render(createCtx(hotRadii), 500, 300, 1000, 1.0);
    const hotRadius = hotRadii[0];

    expect(coolRadius).toBeDefined();
    expect(hotRadius).toBeDefined();
    expect(coolRadius).toBeGreaterThanOrEqual(280);
    expect(hotRadius).toBeGreaterThan(coolRadius);
  });

  it('renders organic stone ring with varied rock morphology and glowing ember bed', () => {
    const flame = new HearthFlameSimulator();
    let ellipseCalls = 0;
    let lineToCalls = 0;

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(() => { lineToCalls++; }),
      bezierCurveTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(() => { ellipseCalls++; }),
      fill: vi.fn(),
      stroke: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D;

    flame.render(mockCtx, 500, 300, 1500, 0.5);

    // Ash bed uses natural polygon lineTo segments
    expect(lineToCalls).toBeGreaterThanOrEqual(20);
    // Stones use elliptical facets with highlights
    expect(ellipseCalls).toBeGreaterThanOrEqual(16);
  });

  it('renders a dense multi-tongue flame with at least 50 tongues across core, body, and mantle', () => {
    const flame = new HearthFlameSimulator();
    let bezierCurveToCalls = 0;

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(() => { bezierCurveToCalls++; }),
      arc: vi.fn(),
      ellipse: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'round',
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D;

    flame.render(mockCtx, 500, 300, 1500, 0.5);

    // Each flame tongue uses 2 bezierCurveTo calls for left and right edges
    // With >= 50 tongues, we expect >= 100 bezierCurveTo calls
    expect(bezierCurveToCalls).toBeGreaterThanOrEqual(100);
  });
});
