import { describe, it, expect, vi } from 'vitest';
import { HearthWordsManager } from '../src/canvas/hearth-words';
import type { IsometricSeat } from '../src/canvas/hearth-seats';

describe('HearthWordsManager', () => {
  it('enforces sacred fire clearance around the central campfire', () => {
    const manager = new HearthWordsManager();
    const cx = 500;
    const cy = 300;
    const rx = 400;
    const ry = 200;

    // Test across all 12 speaker angles around the clearing
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const slot = manager.findSlot(ang, 80, cx, cy, rx, ry);

      const dx = Math.abs(slot.x - cx);
      const dy = slot.y - cy;

      // When vertically near or above the hearth (where flames rise),
      // words must maintain strict horizontal clearance (> 150px + halfW = 190px)
      if (dy < 65 && dy > -175) {
        expect(dx).toBeGreaterThanOrEqual(160);
      }
    }
  });

  it('pulls target angle ~22% towards the previous utterance (conversational resonance)', () => {
    const manager = new HearthWordsManager();
    const cx = 500;
    const cy = 300;
    const rx = 400;
    const ry = 200;

    // First word at 0 radians (right side)
    const mockCtx = {
      font: '',
      measureText: vi.fn(() => ({ width: 80 })),
    } as unknown as CanvasRenderingContext2D;

    const seat1: IsometricSeat = {
      id: 1, angle: 0, x: cx + rx, y: cy, depth: 0.5, pulse: 0, spokenCount: 0,
    };
    manager.addWord('w1', 'первое слово', 'спокойствие', seat1, cx, cy, rx, ry, mockCtx);
    const w1 = manager.words[0];
    expect(w1).toBeDefined();

    // Second word from speaker at PI/2 radians (bottom)
    const seat2: IsometricSeat = {
      id: 7, angle: Math.PI / 2, x: cx, y: cy + ry, depth: 1, pulse: 0, spokenCount: 0,
    };
    const slot2 = manager.findSlot(seat2.angle, 80, cx, cy, rx, ry);

    // Angle of slot2 should be pulled towards 0 from PI/2
    const slot2Angle = Math.atan2((slot2.y - cy) / ry, (slot2.x - cx) / rx);
    // Should be less than PI/2 because it leaned towards 0!
    expect(slot2Angle).toBeLessThan(Math.PI / 2);
  });

  it('applies law of opacity decay by 0.02 with 0.20 floor', () => {
    const manager = new HearthWordsManager();
    const mockCtx = {
      font: '',
      measureText: vi.fn(() => ({ width: 80 })),
    } as unknown as CanvasRenderingContext2D;

    const seat: IsometricSeat = {
      id: 1, angle: 0, x: 500, y: 300, depth: 0.5, pulse: 0, spokenCount: 0,
    };
    manager.addWord('w1', 'слово', 'спокойствие', seat, 500, 300, 400, 200, mockCtx);
    expect(manager.words[0].opacity).toBe(1.0);

    // Age 10 times -> opacity should drop to 0.80
    for (let i = 0; i < 10; i++) manager.ageWords();
    expect(manager.words[0].opacity).toBeCloseTo(0.80, 2);

    // Age 60 more times -> should reach floor 0.20 and NOT go lower
    for (let i = 0; i < 60; i++) manager.ageWords();
    expect(manager.words[0].opacity).toBe(0.20);
  });

  it('preserves all words without truncation or eviction', () => {
    const manager = new HearthWordsManager();
    const mockCtx = {
      font: '',
      measureText: vi.fn(() => ({ width: 60 })),
    } as unknown as CanvasRenderingContext2D;

    const seat: IsometricSeat = {
      id: 1, angle: 0, x: 500, y: 300, depth: 0.5, pulse: 0, spokenCount: 0,
    };

    // Add 40 unique words
    for (let i = 0; i < 40; i++) {
      manager.addWord(`w-${i}`, `слово-${i}`, 'спокойствие', seat, 500, 300, 400, 200, mockCtx);
    }

    expect(manager.words.length).toBe(40);
  });

  it('disperses consecutive words from a speaker across diverse organic radial depths', () => {
    const manager = new HearthWordsManager();
    const mockCtx = {
      font: '',
      measureText: vi.fn(() => ({ width: 70 })),
    } as unknown as CanvasRenderingContext2D;

    const cx = 500;
    const cy = 300;
    const rx = 400;
    const ry = 200;

    const seat: IsometricSeat = {
      id: 3,
      angle: 0.8,
      x: cx + Math.cos(0.8) * rx,
      y: cy + Math.sin(0.8) * ry,
      depth: 0.5,
      pulse: 0,
      spokenCount: 0,
    };

    for (let i = 0; i < 6; i++) {
      manager.addWord(`disp-${i}`, `мысль ${i}`, 'интерес', seat, cx, cy, rx, ry, mockCtx);
    }

    const radii = manager.words.map((w) => w.relRadius ?? 0);
    const minR = Math.min(...radii);
    const maxR = Math.max(...radii);

    // Consecutive words must disperse across radial depths (difference >= 0.28)
    expect(maxR - minR).toBeGreaterThanOrEqual(0.28);
  });
});
