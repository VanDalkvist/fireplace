# Architecture Improvement Plan - Cycle 23: Speaker Turn Memory Buffer & Few-Shot Distillation

## Goal
Implement a lightweight, non-invasive Speaker Turn Memory Buffer (`SpeakerTurnBuffer`) and conversational context memory in `phrase-distiller` so that consecutive speech chunks from the same speaker are seamlessly stitched, eliminating dangling fragments ("для", "как") and operational noise while preserving full authentic thoughts at the hearth.

## Architecture Context Map
- `src/domain/speaker-turn-buffer.ts` (NEW): Pure domain class for turn-taking debounce (2.2s), dangling preposition detection, and recent conversational history ring buffer.
- `src/domain/phrase-distiller.ts`: Enhanced with Few-Shot IT-aware prompt, `recentContext` memory, and fixed `isAmputationOrLeak` guard (respecting `phrase: ""` drops).
- `src/hooks/useSalonSpeech.ts`: Integrates `SpeakerTurnBuffer` into `handleSpeechResult` with auto-flush on pause and speaker switch.
- `tests/speaker-turn-buffer.test.ts` (NEW): Unit tests for turn aggregation, dangling stitching, and history tracking.
- `tests/phrase-distiller.test.ts`: Regression tests for few-shot distillation, IT-term repair, and noise filtering.

## Findings Selected for `fix-now`
- **[P1] Isolated Chunk Fragmentation**: VAD cuts speech on 700ms micro-pauses or 12s ceiling, leaving dangling prepositions ("была на бэтенде для") and split thoughts ("большие группы контактов").
- **[P1] Defective `isAmputationOrLeak` Override**: `phraseClean.length === 0` treated intentional drops (`phrase: ""`) as leaks and forcibly injected raw meeting chatter into the hearth.
- **[P2] Stateless Distillation**: Qwen 1.5B had zero memory of preceding turns, causing out-of-context hallucinations on short phrases ("делишься опытом").
- **[P2] IT Lexicon Distortions**: Speech recognition mishears product/tech terms ("бэтенд" -> "бэкенд", "пошерить" -> "пошарить").

---

## Tasks & Fix Slices

### Task 1: Create `SpeakerTurnBuffer` Domain Module (TDD)
- [ ] Write failing test `tests/speaker-turn-buffer.test.ts`:
  - Stitches consecutive chunks from same speaker within 2200ms gap.
  - Holds and merges dangling prepositions/conjunctions ("для", "как", "что").
  - Flushes immediately when speaker seat changes.
  - Maintains `recentContext` ring buffer of last 3 completed phrases.
- [ ] Implement `src/domain/speaker-turn-buffer.ts` ($\le 120$ lines).
- [ ] Verify `tests/speaker-turn-buffer.test.ts` PASS.

### Task 2: Enhance `phrase-distiller` with Few-Shot IT Prompt & Memory Context
- [ ] Add `isDanglingFragment` and IT-term normalizer dictionary in `src/domain/phrase-distiller.ts`.
- [ ] Update `distillWithNeuralFallback` to accept `recentContext?: string[]`.
- [ ] Fix `isAmputationOrLeak` bug: if LLM returns `phraseClean === ""` and raw phrase is filler/noise/dangling, return empty result (drop) instead of forcing `repaired`.
- [ ] Update few-shot prompt with IT-meeting context (бэкенд, спейс, боты).
- [ ] Verify `tests/phrase-distiller.test.ts` PASS.

### Task 3: Integrate Memory Buffer in `useSalonSpeech.ts`
- [ ] Wire `SpeakerTurnBuffer` into `useSalonSpeech.ts` with a debounce timer (2200ms).
- [ ] Pass `recentContext` from buffer into `distillWithNeuralFallback`.
- [ ] Flush buffer on speaker change or manual silence.
- [ ] Verify full test suite (`npm test`), `npm run typecheck`, and line count limits ($\le 250$ lines per AP-019).

### Task 4: Verification, Ledger & Memory Update
- [ ] Dual-circuit review (Architectural AP-rules PASS + Product PASS).
- [ ] Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- [ ] Commit, push to `origin/main`, restart PM2 `salon-presence`, and log to GBrain.
