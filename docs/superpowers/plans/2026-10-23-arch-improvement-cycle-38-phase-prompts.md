# Phase Prompt Strategies (Cycle 38) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement independent, modular prompt strategies for each phase of the presence salon («feelings», «desires», «completion») through a clean Strategy + Registry pattern, without breaking existing logic or breaching AP-019 line limits.

**Architecture:** Hexagonal Strategy + Registry pattern in `src/domain/prompts/`. `PhasePromptStrategy` defines port methods (`buildPrompt`, `parseResponse`, `createFallback`). `PromptRegistry` manages strategies by `SessionPhase`. `phrase-distiller.ts` acts as a thin orchestrator delegating to the registry. `useSalonSpeech.ts` passes the active session phase and routes completions seamlessly.

**Tech Stack:** TypeScript (strict, 0 any), Vitest, React, Vite.

---

### Task 1: Prompt Strategy Types & Contract (AP-026, AP-029)

**Files:**
- Create: `src/domain/prompts/types.ts`
- Test: `tests/prompts/prompt-types.test.ts`

- [x] **Step 1: Write test for prompt strategy interface and types**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Implement `src/domain/prompts/types.ts`**
- [x] **Step 4: Run test to verify pass**
- [x] **Step 5: Commit contract definition**

---

### Task 2: Individual Phase Prompt Strategies (AP-010, AP-011, AP-014, AP-019)

**Files:**
- Create: `src/domain/prompts/feelings-prompt.ts`
- Create: `src/domain/prompts/desires-prompt.ts`
- Create: `src/domain/prompts/completion-prompt.ts`
- Test: `tests/prompts/phase-prompts.test.ts`

- [x] **Step 1: Write unit tests for Feelings, Desires, and Completion strategies**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Implement `FeelingsPromptStrategy`**
- [x] **Step 4: Implement `DesiresPromptStrategy`**
- [x] **Step 5: Implement `CompletionPromptStrategy`**
- [x] **Step 6: Run tests to verify pass**
- [x] **Step 7: Commit strategies**

---

### Task 3: Prompt Registry as Composition Root (AP-014, AP-020)

**Files:**
- Create: `src/domain/prompts/prompt-registry.ts`
- Test: `tests/prompts/prompt-registry.test.ts`

- [x] **Step 1: Write unit tests for PromptRegistry resolution and defaults**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Implement `PromptRegistry` and export `defaultPromptRegistry`**
- [x] **Step 4: Run test to verify pass**
- [x] **Step 5: Commit registry**

---

### Task 4: Refactor `phrase-distiller.ts` (AP-019, AP-046)

**Files:**
- Modify: `src/domain/phrase-distiller.ts`
- Test: `tests/phrase-distiller.test.ts`
- Test: `tests/distiller-adapters.test.ts` (fix unused `DistillerRegistry` import)

- [x] **Step 1: Write unit test asserting phase-aware prompt selection in `distillWithNeuralFallback`**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Refactor `phrase-distiller.ts` to delegate to `defaultPromptRegistry` and fix TS warnings**
- [x] **Step 4: Fix TS warning in `tests/distiller-adapters.test.ts`**
- [x] **Step 5: Run tests and `npm run typecheck` to verify pass**
- [x] **Step 6: Commit refactor**

---

### Task 5: Runtime Phase Integration in `useSalonSpeech.ts` (AP-010, AP-026)

**Files:**
- Modify: `src/hooks/useSalonSpeech.ts`
- Test: `tests/salon-speech.test.ts`

- [x] **Step 1: Write test verifying phase parameter passed to distillation and completion routing**
- [x] **Step 2: Run test to verify failure**
- [x] **Step 3: Update `useSalonSpeech.ts` to pass `phase` to `distillWithNeuralFallback` and route `completion`**
- [x] **Step 4: Run tests to verify pass**
- [x] **Step 5: Commit hook integration**

---

### Task 6: Verification & Dual-Circuit Review (S9)

- [x] **Step 1: Run full test suite (`npm test`), type check (`npm run typecheck`), and build (`npm run build`)**
- [x] **Step 2: Run Architectural Reviewer subagent (`antigravity/gemini-3.8-flash --reasoning-level high`)**
- [x] **Step 3: Run Product Reviewer subagent (`antigravity/gemini-3.8-flash --reasoning-level high`)**
- [x] **Step 4: Verify dual PASS verdicts**

---

### Task 7: Ledger and Memory Update (S10, S11)

- [x] **Step 1: Document Cycle 38 in `docs/arch-improvement/review-log.md`**
- [x] **Step 2: Record architectural lessons in `docs/arch-improvement/memory.md`**
- [x] **Step 3: Commit and push to private repository**
