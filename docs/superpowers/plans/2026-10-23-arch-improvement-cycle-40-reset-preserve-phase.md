# Cycle 40: Preserve Active Practice Phase Across Circle Reset (AP-013, AP-019)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `handleResetCircle` in `src/hooks/useSalonSession.ts` so that clearing the campfire circle wipes participants, feelings, desires, and connection links as before, but strictly preserves the user's currently selected practice phase across all 4 phases (`silence`, `feelings`, `desires`, `completion`).

**Architecture Context Map:**
- `src/hooks/useSalonSession.ts`: Orchestrates React session state, phase selections, turn handoffs, persistence sync, and circle reset.
- `src/domain/session-fsm.ts`: Pure functional state machine transitions (`createInitialState`, `setPhase`, `resetParticipants`).
- `src/infrastructure/salon-persistence.ts`: LocalStorage sync for session and hearth words.
- `src/canvas/motion-engine.ts`: Canvas word-cache cleanup must not delete the hook-owned session or its selected phase.
- `src/components/SalonExperience.tsx`: Composition root and UI integration for the technical pult, header, canvas, and reset action.

**Findings & Triage (Finding Format):**
- **[P1] Reset Handler Overwrites Active Phase with Silence**
  - **Evidence:** `src/hooks/useSalonSession.ts:204-207`:
    ```typescript
    const handleResetCircle = useCallback(() => {
      clearAllSalonPersistence();
      setState(() => resetParticipants(createInitialState(0)));
    }, []);
    ```
    `createInitialState(0)` at `src/domain/session-fsm.ts:20` returns `{ phase: "silence", participants: [], ... }`. `resetParticipants(...)` returns that state with `phase: "silence"`.
  - **Impact:** When a user or facilitator clicks "Сбросить круг" while conducting a practice in `feelings`, `desires`, or `completion`, the phase abruptly jumps back to `silence`. This disrupts the group flow, causes LLM prompt desynchronization (as speech routing depends on `state.phase`), and requires manual phase re-selection.
  - **Rule:** AP-013 (Целостность пользовательских данных и инвариантов состояния), AP-018 (Ясность и одна ответственность).
  - **Fix Decision:** `fix-now`. Preserve the existing practice phase using a pure functional state updater:
    ```typescript
    setState((prev: SessionState) => ({
      ...resetParticipants(createInitialState(0)),
      phase: prev.phase,
    }));
    ```
    This preserves all initial reset defaults (`participants: []`, `activeSpeakerId: null`, `feelings: []`, `desires: []`, `connections: []`, `isListening: true`, `isMuted: false`) while retaining the currently selected `prev.phase`.

- **Exclusions (log-only / blocked):**
  - No LLM prompt / extraction changes or verbatim prompt rewrites.
  - No in-flight LLM network race cancellation changes.
  - No UI layout or CSS changes in `TechnicalGearPult` or `SalonExperience`.
  - No database, audio-engine, or external service refactoring.

**Tech Stack:** React 19, TypeScript (strict, 0 any, AP-029), Vitest (AP-028), AP-019 line limits ($\le 250$ lines).

---

### Task 1: Hook-Level Regression Test for Phase Preservation on Reset (AP-013, AP-028)

**Files:**
- Create: `tests/session-reset-phase.test.ts`

**Exact Test Cases:**
1. `preserves phase 'silence' when circle is reset with active participants and tokens`
2. `preserves phase 'feelings' when circle is reset with active participants and tokens`
3. `preserves phase 'desires' when circle is reset with active participants and tokens`
4. `preserves phase 'completion' when circle is reset with active participants and tokens`
5. `preserves latest selected phase on repeated consecutive resets`

**Harness & Test Code (as executed, using public hook mocks):**
```typescript
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
```

- [x] **Step 1: Write integration/hook-level unit test suite covering `handleResetCircle`**
- [x] **Step 2: Run test suite to observe RED failure on existing code**
  - Command: `npx vitest run tests/session-reset-phase.test.ts`
  - Expected failure: `AssertionError: expected 'silence' to be 'feelings'`, `expected 'silence' to be 'desires'`, `expected 'silence' to be 'completion'`.
- [x] **Step 3: Send RED status update to parent thread**

---

### Task 2: Minimal Implementation of Functional Phase Preservation in `useSalonSession` (AP-013, AP-019)

**Files:**
- Modify: `src/hooks/useSalonSession.ts`

- [x] **Step 1: Update `handleResetCircle` in `src/hooks/useSalonSession.ts`**
  - Change lines 204-207:
    ```typescript
    // OLD:
    const handleResetCircle = useCallback(() => {
      clearAllSalonPersistence();
      setState(() => resetParticipants(createInitialState(0)));
    }, []);

    // NEW:
    const handleResetCircle = useCallback(() => {
      clearAllSalonPersistence();
      setState((prev: SessionState) => ({
        ...resetParticipants(createInitialState(0)),
        phase: prev.phase,
      }));
    }, []);
    ```
  - Verify `useSalonSession.ts` lines $\le 250$ (current 228 lines).
- [x] **Step 2: Run test suite to observe GREEN pass**
  - Command: `npx vitest run tests/session-reset-phase.test.ts`
- [x] **Step 3: Run full regression test suite, typecheck, and build**
  - Command: `npm test && npx tsc --noEmit && npm run build`

---

### Task 3: Ledger & Verification Documentation (AP-019, AP-028)

**Files:**
- Modify: `docs/arch-improvement/review-log.md`

- [x] **Step 1: Append Cycle 40 entry to `docs/arch-improvement/review-log.md`**
- [x] **Step 2: Verify line count budgets on all modified files**
- [x] **Step 3: Record S9 quota blocker.** User explicitly authorized parent-only completion on 2026-10-23: «Завершить твоей проверкой». Independent S9a/S9b are waived for this cycle, not marked PASS.

---

### Task 4: Preserve the Saved Session During Canvas Reset (Same Bug, Browser Finding)

**Architecture context:** `SalonMotionEngine.syncTokens` owns the visual word cache, not full session storage. Its post-reset cleanup must not erase the phase-preserving session saved by `useSalonSession`.

- [P1] Canvas performs a second full persistence wipe after a populated-circle reset.
  - Evidence: isolated Browser Automation Storage traces: hook `saveSessionPersistence` writes `phase: feelings`, then `motion-engine.ts:79` calls `clearAllSalonPersistence` and deletes that session.
  - Impact: current phase survives visually but is lost on reload.
  - Rule: AP-013, AP-018, AP-028.
  - Fix decision: fix-now; no changes to prompts, audio, providers, UI, or unrelated async work.

**Files:**
- Create: `tests/motion-reset-phase.test.ts`
- Modify: `src/canvas/motion-engine.ts` (replace the full-storage clear with the existing word-cache save only).

- [x] Add deterministic regression tests for all four phases. Populate a real `SalonMotionEngine` with a feeling token, simulate hook reset via `clearAllSalonPersistence(); saveSessionPersistence(cleanState, 0)`, then run `engine.syncTokens([], [], [], null, 800, 600, ctx)`. Assert the saved clean session retains the selected phase and both in-memory and restored visual words are empty.
- [x] RED: `npx vitest run tests/motion-reset-phase.test.ts` must fail because the persisted session becomes null.
- [x] Minimal production patch, using the existing persistence API:
  ```typescript
  // import saveHearthWordsPersistence instead of clearAllSalonPersistence
  // In the existing zero-tokens reset branch:
  this.knownTokenIds.clear();
  this.words.words = [];
  this.currentHeat = 0.0;
  saveHearthWordsPersistence([]);
  ```
  Full clearing of links/legacy session keys remains owned by the existing hook reset. No new public API/dependency or changed UI wiring.
- [x] GREEN: rerun both reset test files, all tests, typecheck, build, diff whitespace and touched source line budgets.
- [x] Browser Automation acceptance in a NEW isolated headless session: mock the shared speaker `/reset`, never start mic, select each phase and reset, populate/stop demo before resetting, verify phase survives reset and reload, test repeated reset and rapid phase changes. Never operate the user's live browser.
- [x] Parent self-review against AP-013/AP-018/AP-019/AP-028/AP-029/AP-053, update canonical ledger with explicit independent-review waiver, verify diff scope, commit and push the private repo.

**S7 plan review:** The second cleanup is directly responsible for losing the same selected phase on reload. Scoping Canvas cleanup to its word cache is the smallest boundary-preserving patch; the hook continues its original full circle cleanup. This is not a general persistence refactor.


**Completion evidence:** Canvas regression RED 4/4 failures (saved session undefined), GREEN 4/4; both reset suites 9/9; full suite 179/179, typecheck/build/diff-check PASS. Browser session `17d6c076-1c49-478e-8a6a-666b171ca39e`: cold-start, populated reset, all phases, repeated/rapid phase reset and reload PASS; shared speaker reset mocked, microphone never started. S9 performed as parent self-review under explicit user waiver, not independent review. Commit/push receipt is recorded in the final response.
