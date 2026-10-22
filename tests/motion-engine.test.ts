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
});
