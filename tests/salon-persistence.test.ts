import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveHearthWordsPersistence,
  loadHearthWordsPersistence,
  saveSessionPersistence,
  loadSessionPersistence,
  clearAllSalonPersistence,
} from "../src/infrastructure/salon-persistence";
import type { HearthWordItem } from "../src/canvas/hearth-words";
import type { SessionState } from "../src/domain/types";

describe("SalonPersistence", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const mockStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
    vi.stubGlobal("localStorage", mockStorage);
    vi.stubGlobal("window", { localStorage: mockStorage });
  });

  it("saves and loads hearth words with positions and state", () => {
    const words: HearthWordItem[] = [
      {
        id: "w-1",
        text: "спокойствие",
        family: "покой",
        seatId: 1,
        width: 120,
        x: 450,
        y: 280,
        targetX: 450,
        targetY: 280,
        born: 1000,
        lastAt: 2000,
        count: 2,
        settled: true,
        opacity: 0.85,
        breathOffset: 1.2,
      },
    ];

    saveHearthWordsPersistence(words);
    const loaded = loadHearthWordsPersistence();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].text).toBe("спокойствие");
    expect(loaded[0].x).toBe(450);
    expect(loaded[0].targetX).toBe(450);
    expect(loaded[0].settled).toBe(true);
  });

  it("saves and loads session state (feelings, desires, participants, heat)", () => {
    const session: Partial<SessionState> = {
      feelings: [
        {
          id: "f-1",
          text: "тепло",
          lemma: "тепло",
          family: "нежность",
          valence: 0.8,
          arousal: 0.3,
          intensity: 1.0,
          speakerId: 1,
          timestamp: 1000,
        },
      ],
      desires: [],
      participants: [
        { id: 1, seatNumber: 1, role: "light", isSpeaking: true, hasPassed: false, isHost: true },
      ],
      phase: "feelings",
    };

    saveSessionPersistence(session as SessionState, 0.45);
    const loaded = loadSessionPersistence();

    expect(loaded).not.toBeNull();
    expect(loaded?.session.feelings).toHaveLength(1);
    expect(loaded?.session.feelings[0].text).toBe("тепло");
    expect(loaded?.heat).toBeCloseTo(0.45, 2);
  });

  it("clears all persistence on reset", () => {
    saveHearthWordsPersistence([{ id: "w-1" } as unknown as HearthWordItem]);
    clearAllSalonPersistence();

    expect(loadHearthWordsPersistence()).toEqual([]);
    expect(loadSessionPersistence()).toBeNull();
  });

  it("sanitizes words loaded from previous sessions (v1 fallback and future timestamps)", () => {
    store["salon_presence_words_v1"] = JSON.stringify([
      {
        id: "w-old",
        text: "старое",
        born: 9999999999999,
        lastAt: 9999999999999,
      },
    ]);

    const loaded = loadHearthWordsPersistence();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].settled).toBe(true);
    expect(loaded[0].born).toBeLessThanOrEqual(Date.now());
    expect(loaded[0].lastAt).toBeLessThanOrEqual(Date.now());
  });
});
