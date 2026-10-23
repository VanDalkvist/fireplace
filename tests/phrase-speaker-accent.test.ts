import { describe, it, expect, vi, afterEach } from "vitest";
import { SalonMotionEngine } from "@/canvas/motion-engine";
import type { Participant, FeelingToken } from "@/domain/types";

const participants: Participant[] = [1, 2].map(id => ({ id, seatNumber: id, role: "guest", isSpeaking: id === 1, hasPassed: false, isHost: id === 1 }));
const token: FeelingToken = { id: "accent-test", text: "тепло", lemma: "тепло", family: "нежность", valence: .5, arousal: .5, intensity: 1, speakerId: 2, timestamp: 1000 };
const ctx = { font: "", measureText: () => ({ width: 80 }) } as unknown as CanvasRenderingContext2D;
afterEach(() => vi.restoreAllMocks());

describe("accepted phrase speaker activity", () => {
  it("pulses the attributed owner and refreshes on real text update, not repeated frames", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1000), engine = new SalonMotionEngine();
    engine.syncTokens([token], [], participants, 1, 1000, 800, ctx);
    expect(engine.seats.seats.find(seat => seat.id === 2)?.lastSpokenAt).toBe(1000);
    now.mockReturnValue(7000);
    const updated = { ...token, text: "тепло и спокойствие", lemma: "тепло и спокойствие" };
    engine.syncTokens([updated], [], participants, 1, 1000, 800, ctx);
    expect(engine.seats.seats.find(seat => seat.id === 2)?.lastSpokenAt).toBe(7000);
    now.mockReturnValue(8000);
    engine.syncTokens([updated], [], participants, 1, 1000, 800, ctx);
    expect(engine.seats.seats.find(seat => seat.id === 2)?.lastSpokenAt).toBe(7000);
  });

  it("keeps orphaned phrase text visible without creating a participant dot", () => {
    const engine = new SalonMotionEngine();
    engine.syncTokens([token], [], [], null, 1000, 800, ctx);
    expect(engine.words.words.map(word => word.text).join("")).toBe(token.text);
    expect(engine.words.words[0].seatId).toBe(token.speakerId);
    expect(engine.seats.seats).toEqual([]);
  });

  it("retains text placement but never accents an arbitrary fallback participant", () => {
    const engine = new SalonMotionEngine();
    engine.syncTokens([{ ...token, speakerId: 99 }], [], participants, 1, 1000, 800, ctx);
    expect(engine.words.words.map(word => word.text).join("")).toBe(token.text);
    expect(engine.words.words[0].seatId).toBe(99);
    expect(engine.seats.seats.every(seat => seat.lastSpokenAt === undefined)).toBe(true);
  });
});
