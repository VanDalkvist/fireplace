import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SalonMotionEngine } from "../src/canvas/motion-engine";
import { createInitialState } from "../src/domain/session-fsm";
import type { FeelingToken, SessionPhase } from "../src/domain/types";
import {
  clearAllSalonPersistence,
  loadHearthWordsPersistence,
  loadSessionPersistence,
  saveSessionPersistence,
} from "../src/infrastructure/salon-persistence";

beforeEach(() => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T14:00:00Z"));
  vi.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("canvas cleanup after a phase-preserving circle reset", () => {
  const phases: SessionPhase[] = ["silence", "feelings", "desires", "completion"];
  const token: FeelingToken = {
    id: "reset-fixture",
    text: "спокойствие",
    lemma: "спокойствие",
    family: "покой",
    valence: 0.5,
    arousal: 0.2,
    intensity: 1,
    speakerId: 1,
    timestamp: Date.parse("2026-10-23T14:00:00Z"),
  };

  it("restores logical phrase content when the visual cache is absent", () => {
    const state = { ...createInitialState(1), phase: "feelings" as const, feelings: [token] };
    saveSessionPersistence(state, 0);
    const engine = new SalonMotionEngine();
    const ctx = { font: "", measureText: () => ({ width: 80 }) } as unknown as CanvasRenderingContext2D;
    engine.syncTokens(state.feelings, [], state.participants, 1, 800, 600, ctx);
    expect(engine.words.words.map(word => word.text).join("")).toBe(token.text);
  });

  it.each(phases)("keeps persisted phase %s when removing the last canvas words", (phase) => {
    const engine = new SalonMotionEngine();
    const participants = createInitialState(1).participants;
    const ctx = {
      measureText: () => ({ width: 80 }),
      font: "",
    } as unknown as CanvasRenderingContext2D;
    engine.syncTokens([token], [], participants, 1, 800, 600, ctx);
    expect(engine.words.words).toHaveLength(1);
    expect(loadHearthWordsPersistence()).toHaveLength(1);

    // React saves the clean session before the next Canvas animation frame.
    const cleanState = { ...createInitialState(0), phase };
    clearAllSalonPersistence();
    saveSessionPersistence(cleanState, 0);
    engine.syncTokens([], [], [], null, 800, 600, ctx);

    expect(loadSessionPersistence()?.session).toEqual(cleanState);
    expect(engine.words.words).toEqual([]);
    expect(engine.seats.seats).toEqual([]);
    expect(engine.currentHeat).toBe(0);
    expect(loadHearthWordsPersistence()).toEqual([]);
    expect(new SalonMotionEngine().words.words).toEqual([]);
  });
});
