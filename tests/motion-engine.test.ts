import { describe, it, expect, vi } from "vitest";
import { SalonMotionEngine } from "../src/canvas/motion-engine";
import type { FeelingToken, Participant } from "../src/domain/types";

describe("SalonMotionEngine", () => {
  const createMockCtx = () =>
    ({
      measureText: vi.fn().mockReturnValue({ width: 50 }),
      font: "",
    } as unknown as CanvasRenderingContext2D);

  it("initializes and resizes viewport bounds", () => {
    const engine = new SalonMotionEngine();
    engine.resize(1000, 800);

    expect(engine.cx).toBe(500);
    expect(engine.floorCY).toBe(400);
    expect(engine.floorRx).toBeGreaterThan(0);
    expect(engine.floorRy).toBeGreaterThan(0);
  });

  it("synchronizes feelings into floating words", () => {
    const engine = new SalonMotionEngine();
    const mockCtx = createMockCtx();

    const participants: Participant[] = [
      { id: 1, seatNumber: 1, role: "light", isSpeaking: true, hasPassed: false, isHost: true },
    ];
    const feelings: FeelingToken[] = [
      {
        id: "feel-1",
        text: "тепло",
        lemma: "тепло",
        family: "нежность",
        valence: 0.5,
        arousal: 0.5,
        intensity: 1.2,
        speakerId: 1,
        timestamp: Date.now(),
      },
    ];

    engine.syncTokens(feelings, [], participants, 1, 800, 600, mockCtx);

    expect(engine.words.words.length).toBe(1);
    expect(engine.words.words[0].text).toBe("тепло");

    // Deduplication check: re-syncing same token does not create duplicate word
    engine.syncTokens(feelings, [], participants, 1, 800, 600, mockCtx);
    expect(engine.words.words.length).toBe(1);
  });

  it("clears floating words and token cache when session is reset", () => {
    const engine = new SalonMotionEngine();
    const mockCtx = createMockCtx();

    const participants: Participant[] = [
      { id: 1, seatNumber: 1, role: "light", isSpeaking: true, hasPassed: false, isHost: true },
    ];
    const feelings: FeelingToken[] = [
      {
        id: "feel-1",
        text: "замедление",
        lemma: "замедление",
        family: "спокойствие",
        valence: 0.2,
        arousal: 0.2,
        intensity: 1.0,
        speakerId: 1,
        timestamp: Date.now(),
      },
    ];

    engine.syncTokens(feelings, [], participants, 1, 800, 600, mockCtx);
    expect(engine.words.words.length).toBe(1);

    // Reset circle (empty feelings and desires)
    engine.syncTokens([], [], [], null, 800, 600, mockCtx);
    expect(engine.words.words.length).toBe(0);
    expect(engine.seats.seats.length).toBe(0);
  });

  it("calculates progressive heat accumulation from words with speech boost", () => {
    const engine = new SalonMotionEngine();

    // 0 words, silent
    expect(engine.computeTargetHeat(0, false)).toBe(0);

    // 0 words, someone speaking -> gentle spark boost
    expect(engine.computeTargetHeat(0, true)).toBeGreaterThan(0.08);

    // Progressive ignition as words fill the circle
    const heat5 = engine.computeTargetHeat(5, false);
    const heat15 = engine.computeTargetHeat(15, false);
    const heat30 = engine.computeTargetHeat(30, false);

    expect(heat5).toBeGreaterThan(0.25);
    expect(heat15).toBeGreaterThan(heat5);
    expect(heat30).toBeGreaterThan(heat15);
    expect(heat30).toBeLessThanOrEqual(1.0);
  });

  it("smoothly interpolates current heat during render loop", () => {
    const engine = new SalonMotionEngine();
    const mockCtx = {
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fillText: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      globalCompositeOperation: "source-over",
    } as unknown as CanvasRenderingContext2D;

    // Simulate 15 words accumulated in circle
    engine.words.words = Array(15).fill({ text: "слово" } as unknown);

    expect(engine.currentHeat).toBe(0);
    engine.render(mockCtx, 800, 600, null, 1000);
    expect(engine.currentHeat).toBeGreaterThan(0);
    const firstHeat = engine.currentHeat;

    engine.render(mockCtx, 800, 600, null, 1016);
    expect(engine.currentHeat).toBeGreaterThan(firstHeat);
  });

  it("triggers instant flame flare when a new word enters the circle", () => {
    const engine = new SalonMotionEngine();
    const mockCtx = createMockCtx();
    const participants: Participant[] = [
      { id: 1, seatNumber: 1, role: "light", isSpeaking: true, hasPassed: false, isHost: true },
    ];
    const initialHeat = engine.currentHeat;

    const feelings: FeelingToken[] = [
      {
        id: "flare-token-1",
        text: "живость",
        lemma: "живость",
        family: "живость",
        valence: 0.8,
        arousal: 0.8,
        intensity: 1.5,
        speakerId: 1,
        timestamp: Date.now(),
      },
    ];

    engine.syncTokens(feelings, [], participants, 1, 800, 600, mockCtx);
    expect(engine.currentHeat).toBeGreaterThanOrEqual(initialHeat + 0.2);
  });
});
