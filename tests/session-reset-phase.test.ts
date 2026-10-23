import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SessionPhase } from "../src/domain/types";
import { loadSessionPersistence } from "../src/infrastructure/salon-persistence";

let hookIndex = 0;
const hookValues: unknown[] = [];
const hookSetters: Array<(updater: unknown) => void> = [];
let pendingEffects: Array<() => void | (() => void)> = [];

function flushEffects(): void {
  const current = [...pendingEffects];
  pendingEffects = [];
  for (const eff of current) {
    eff();
  }
}

vi.mock("react", () => ({
  useState: vi.fn(<T>(initial: T | (() => T)) => {
    const idx = hookIndex++;
    if (hookValues[idx] === undefined) {
      hookValues[idx] = typeof initial === "function" ? (initial as () => T)() : initial;
      hookSetters[idx] = (updater: unknown) => {
        hookValues[idx] =
          typeof updater === "function"
            ? (updater as (prev: unknown) => unknown)(hookValues[idx])
            : updater;
      };
    }
    return [
      hookValues[idx] as T,
      hookSetters[idx] as (updater: T | ((prev: T) => T)) => void,
    ];
  }),
  useRef: vi.fn(<T>(initial: T) => {
    const idx = hookIndex++;
    if (hookValues[idx] === undefined) {
      hookValues[idx] = { current: initial };
    }
    return hookValues[idx] as { current: T };
  }),
  useCallback: vi.fn(<T extends (...args: unknown[]) => unknown>(fn: T) => fn),
  useEffect: vi.fn((effect: () => void | (() => void)) => {
    pendingEffects.push(effect);
  }),
}));

import { useSalonSession } from "../src/hooks/useSalonSession";

describe("useSalonSession handleResetCircle Phase Preservation (Cycle 40)", () => {
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

    hookIndex = 0;
    hookValues.length = 0;
    hookSetters.length = 0;
    pendingEffects = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const ALL_PHASES: SessionPhase[] = ["silence", "feelings", "desires", "completion"];

  for (const targetPhase of ALL_PHASES) {
    it(`preserves phase '${targetPhase}' when circle is reset with active participants and tokens`, () => {
      hookIndex = 0;
      let session = useSalonSession();
      flushEffects();

      // Set target phase
      session.handlePhaseSelect(targetPhase);
      flushEffects();

      // Populate circle with speaker, feeling, desire
      session.handleAddFeeling("живое присутствие", "живость", 1, 1);
      session.handleAddDesire("побыть в тишине", 2);
      flushEffects();

      // Read current state
      hookIndex = 0;
      session = useSalonSession();
      expect(session.state.phase).toBe(targetPhase);
      expect(session.state.participants.length).toBeGreaterThan(0);
      expect(session.state.feelings.length).toBeGreaterThan(0);
      expect(session.state.desires.length).toBeGreaterThan(0);
      expect(session.state.activeSpeakerId).not.toBeNull();

      // Execute circle reset
      session.handleResetCircle();
      hookIndex = 0;
      session = useSalonSession();
      flushEffects();

      // VERIFICATION: phase must be preserved, while circle content is cleared
      expect(session.state.phase).toBe(targetPhase);
      expect(session.state.participants).toEqual([]);
      expect(session.state.activeSpeakerId).toBeNull();
      expect(session.state.feelings).toEqual([]);
      expect(session.state.desires).toEqual([]);
      expect(session.state.connections).toEqual([]);
      expect(session.state.isListening).toBe(true);
      expect(session.state.isMuted).toBe(false);

      // Verify persistence recorded the preserved phase
      const persisted = loadSessionPersistence();
      expect(persisted).not.toBeNull();
      expect(persisted?.session.phase).toBe(targetPhase);
      expect(persisted?.session.participants).toEqual([]);
      expect(persisted?.session.feelings).toEqual([]);
    });
  }

  it("preserves latest selected phase on repeated consecutive resets", () => {
    hookIndex = 0;
    let session = useSalonSession();
    flushEffects();

    // 1. Reset in feelings
    session.handlePhaseSelect("feelings");
    session.handleAddFeeling("тепло", "нежность", 1, 1);
    flushEffects();
    session.handleResetCircle();
    hookIndex = 0;
    session = useSalonSession();
    flushEffects();

    expect(session.state.phase).toBe("feelings");
    expect(session.state.feelings).toEqual([]);

    // 2. Reset in desires
    session.handlePhaseSelect("desires");
    session.handleAddDesire("ясности", 2);
    hookIndex = 0;
    session = useSalonSession();
    flushEffects();
    session.handleResetCircle();
    hookIndex = 0;
    session = useSalonSession();
    flushEffects();

    expect(session.state.phase).toBe("desires");
    expect(session.state.desires).toEqual([]);

    // 3. Reset in completion
    session.handlePhaseSelect("completion");
    hookIndex = 0;
    session = useSalonSession();
    flushEffects();
    session.handleResetCircle();
    hookIndex = 0;
    session = useSalonSession();
    flushEffects();

    expect(session.state.phase).toBe("completion");
  });
});
