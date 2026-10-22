# Implementation Plan - Cycle 21: Calm Indicator, Meaningful Spoken Phrases & Clean Hearth Fire

## Goal
Fix 3 user-reported issues:
1. **Calm, Serene Microphone Indicator**: Eliminate jittery button text/width/color jumps between technical pipeline states (`слышу речь...`, `распознаю (gigaam)...`, `нейрокоррекция...`). The button must be calm and steady, always displaying `"слушаю"` when active and `"микрофон (v)"` when inactive.
2. **Authentic Meaningful Phrases in Hearth Ring**: Fix phrase fragmentation and prompt mutilation. Prevent 7-second audio slicing from severing thoughts; fix Qwen prompt so it stops amputating full thoughts into isolated single-word verbs (`поиграй`, `работает`), and ensure authentic, meaningful phrases (or clean 2–4 word thoughts) enter the circle.
3. **Clean Campfire without Visible Lines**: Remove dashed connection lines cutting across the campfire from seats to words. Keep links tracked strictly in `localStorage` data without visual clutter.

## Architecture Context & Rules
- AP-010: Hexagonal Ports & Adapters boundary.
- AP-012: Adaptive speech endpointing without premature cuts.
- AP-013: Domain purity & authentic speech preservation.
- AP-019: File line limit $\le 250$ lines per file.
- AP-029: Strict TypeScript (0 `any`, 0 type errors).
- AP-054: Calm contemplative UX without visual noise or technical jargon.

---

## Tasks

### Task 1: Calm, Steady Voice Indicator (UX Jitter Elimination)
- **File**: `src/components/salon/VoiceIndicator.tsx`
- **Tests**: `tests/voice-indicator.test.tsx`
- **Changes**:
  - Replace dynamic jumping `getStatusLabel()` with steady states:
    - When active (`isListening`): `"слушаю"`.
    - When inactive: `"микрофон (v)"`.
  - Remove technical engine badges, pipeline phase names, and jumping button borders.
  - Keep the subtle inner pulse dot scaling smoothly with RMS so the user sees live audio responsiveness without text jitter.
- **Verification**:
  - `npm test tests/voice-indicator.test.tsx` green.

### Task 2: Authentic Meaningful Phrases in Hearth Ring (Prompt & Audio Slicing Fix)
- **Files**:
  - `src/speech/whisper-speech-adapter.ts`
  - `src/speech/stream-recorder.ts`
  - `src/domain/phrase-distiller.ts`
  - `src/hooks/useSalonSpeech.ts`
- **Tests**:
  - `tests/phrase-distiller.test.ts`
  - `tests/whisper-speech-adapter.test.ts`
- **Changes**:
  - In `whisper-speech-adapter.ts`: extend monologue ceiling from 7.0s to 12.0s to prevent cutting conversational thoughts mid-sentence.
  - In `stream-recorder.ts`: adjust pause debounce to 700ms for responsive sentence completion.
  - In `phrase-distiller.ts`: rewrite Qwen prompt with explicit anti-amputation instructions:
    - Never reduce a statement to a single detached verb.
    - If input is short ($\le 5$ words), keep the whole authentic phrase cleaned of filler words.
    - If input is longer, extract the core 2–5 word meaningful thought.
  - In `useSalonSpeech.ts`: feed the authentic, coherent phrase into `feelFn` / `desireFn`.
- **Verification**:
  - `npm test tests/phrase-distiller.test.ts` green.
  - Test with live Ollama `qwen2.5:1.5b`.

### Task 3: Remove Visible Link Lines in Campfire
- **File**: `src/canvas/hearth-words.ts`
- **Tests**: `tests/hearth-words.test.ts`
- **Changes**:
  - Remove the temporary dashed line rendering (`if (elapsed < 2400 && speakerSeat) { ... ctx.stroke(); ... }`) that cut across the campfire.
  - Preserve `recordLink()` data persistence in `localStorage` without drawing visible canvas lines.
- **Verification**:
  - `npm test tests/hearth-words.test.ts` green.

### Task 4: Full Verification & Cycle Completion
- Run `npm test`, `npm run typecheck`, `npm run build`.
- Verify AP-019 file line bounds ($\le 250$ lines).
- Restart `salon-presence` in PM2.
- Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- Commit and push to `origin/main`.
