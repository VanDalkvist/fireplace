# Cycle 39: Canvas Text Wrapping, Token Subsumption, Speaker Memory Isolation & Diarization Calibration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate text clipping offscreen via canvas word wrapping and viewport boundary clamping; prevent duplicate hearth words via token subsumption; isolate speaker memory context; and calibrate speaker diarization to prevent phantom seat enrollment on short utterances.

**Architecture:**
1. Canvas text wrapping utility `src/canvas/text-wrapper.ts` with word-boundary splitting and viewport boundary guard in `src/canvas/hearth-words.ts`.
2. Speaker-isolated memory in `src/domain/speaker-turn-buffer.ts` (`historyBySpeaker: Map<number, string[]>`) and phase-change buffer reset in `src/hooks/useSalonSpeech.ts`.
3. Token subsumption in `src/hooks/useSalonSpeech.ts`, `src/domain/session-fsm.ts`, and `src/hooks/useSalonSession.ts`.
4. Audio duration guard ($\ge 1.5$s) and threshold calibration (`0.62`) in `sherpa-speaker-service/src/speaker-engine.ts` and `src/speaker/sherpa-speaker-adapter.ts`.

**Tech Stack:** TypeScript (strict, 0 any), Canvas 2D, Vitest, Bun, Sherpa-ONNX (CAM++).

---

### Task 1: Canvas Text Wrapper & Viewport Boundary Guard (AP-019, AP-070)

**Files:**
- Create: `src/canvas/text-wrapper.ts`
- Modify: `src/canvas/hearth-words.ts`
- Test: `tests/text-wrapper.test.ts`
- Test: `tests/hearth-words.test.ts`

- [ ] **Step 1: Write unit tests for `wrapCanvasText` in `tests/text-wrapper.test.ts`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `src/canvas/text-wrapper.ts`**
- [ ] **Step 4: Update `src/canvas/hearth-words.ts` with multi-line rendering and viewport bounds clamping**
- [ ] **Step 5: Verify tests and AP-019 line limits ($\le 250$ lines)**
- [ ] **Step 6: Commit Task 1**

---

### Task 2: Speaker Memory Isolation & Phase Transition Reset (AP-011, AP-013)

**Files:**
- Modify: `src/domain/speaker-turn-buffer.ts`
- Modify: `src/hooks/useSalonSpeech.ts`
- Test: `tests/speaker-turn-buffer.test.ts`

- [ ] **Step 1: Write unit tests for `historyBySpeaker` and `clearHistory` in `tests/speaker-turn-buffer.test.ts`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement speaker isolation and clearHistory in `SpeakerTurnBuffer`**
- [ ] **Step 4: Wire phase transition reset in `useSalonSpeech.ts`**
- [ ] **Step 5: Run tests and verify line count in `useSalonSpeech.ts` ($\le 250$)**
- [ ] **Step 6: Commit Task 2**

---

### Task 3: Token Subsumption & Fragment Deduplication (AP-013, AP-014)

**Files:**
- Modify: `src/domain/session-fsm.ts`
- Modify: `src/hooks/useSalonSession.ts`
- Modify: `src/hooks/useSalonSpeech.ts`
- Modify: `src/canvas/hearth-words.ts`
- Test: `tests/session-fsm.test.ts`
- Test: `tests/token-subsumption.test.ts`

- [ ] **Step 1: Write unit tests for token update / subsumption in `tests/token-subsumption.test.ts`**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Add `updateFeelingToken` and `updateDesireToken` in `session-fsm.ts` and `useSalonSession.ts`**
- [ ] **Step 4: Implement `updateWordText` in `HearthWordsManager`**
- [ ] **Step 5: Implement recent fragment subsumption check in `useSalonSpeech.ts`**
- [ ] **Step 6: Run tests and verify pass**
- [ ] **Step 7: Commit Task 3**

---

### Task 4: Speaker Diarization Calibration & False Seat Prevention (AP-012, AP-027)

**Files:**
- Modify: `/Users/vanya/Projects/sherpa-speaker-service/src/speaker-engine.ts`
- Modify: `/Users/vanya/Projects/sherpa-speaker-service/src/server.ts`
- Modify: `src/speaker/sherpa-speaker-adapter.ts`
- Test: `/Users/vanya/Projects/sherpa-speaker-service/tests/speaker-calibration.test.ts`

- [ ] **Step 1: Write unit test for minimum enrollment duration and threshold in `sherpa-speaker-service`**
- [ ] **Step 2: Implement duration guard ($\ge 1.5$s) and threshold `0.62` in `speaker-engine.ts`**
- [ ] **Step 3: Update `SherpaSpeakerAdapter` in `salon-presence` to pass `threshold=0.62`**
- [ ] **Step 4: Restart PM2 service `sherpa-speaker` and verify health**
- [ ] **Step 5: Commit Task 4 in both repositories**

---

### Task 5: Verification & Dual-Circuit Review (S9 Gate)

- [ ] **Step 1: Run full test suite (`npm test`), `tsc --noEmit`, and `npm run build`**
- [ ] **Step 2: Run Architectural Reviewer subagent (`antigravity/gemini-3.8-flash --reasoning-level high`)**
- [ ] **Step 3: Run Product Reviewer subagent (`antigravity/gemini-3.8-flash --reasoning-level high`)**
- [ ] **Step 4: Confirm dual PASS verdicts**

---

### Task 6: Ledger and Memory Update (S10, S11)

- [ ] **Step 1: Record Cycle 39 in `docs/arch-improvement/review-log.md`**
- [ ] **Step 2: Record architectural lessons in `docs/arch-improvement/memory.md`**
- [ ] **Step 3: Commit and push changes to private repositories**
