# Implementation Plan - Cycle 22: Fullscreen Hearth Clearing, Semantic Phrase Slicing, Majestic Flame & Clean UI

## Goal
Fulfill user directives:
1. **Remove "распознавание sber giga" technical subtitle**: Eliminate artificial engine name emitted in `onInterimPhrase` during segment processing. The indicator shows only calm `"слушаю"` or real live interim text.
2. **Fullscreen Hearth Clearing**: Expand isometric clearing oval (`floorRx`) to full screen width (`width * 0.46`), removing the arbitrary 920px cap so wide monitors are fully utilized.
3. **Semantic Slicing for Long Monologues**: Instead of packing a 20-word paragraph into one unwieldy text block, split long conversational compound sentences into 2–3 meaningful semantic phrases (3–6 words each) so they distribute gracefully around the expansive clearing.
4. **Magnify Campfire & Typography**:
   - Increase typography font size from 17px/18px to 20px/22px JetBrains Mono.
   - Scale up campfire baseline size by 25–30% and amplify heat growth (`wordContribution` with $\tau = 9$) so the fire's growth from embers to roaring flames is unmistakably vivid as phrases accumulate.

## Architecture Context & Rules
- AP-010: Clean decoupling between ASR adapter and UI.
- AP-013: Domain authenticity & meaningful speech preservation.
- AP-019: File line limit $\le 250$ lines per file.
- AP-029: Strict TypeScript (0 `any`, 0 type errors).
- AP-054: Serene, contemplative UX without technical clutter.

---

## Tasks

### Task 1: Silence Technical Engine Subtitle
- **File**: `src/speech/whisper-speech-adapter.ts`
- **Changes**:
  - Remove `this.callbacks.onInterimPhrase?.("распознавание " + this.asrPort.name + "...")`.
  - Let interim text stay empty during segment processing, keeping the VoiceIndicator completely calm and displaying `"слушаю"`.

### Task 2: Fullscreen Clearing & Magnified Hearth Flame
- **Files**:
  - `src/canvas/motion-engine.ts`
  - `src/canvas/hearth-flame.ts`
  - `src/canvas/hearth-words.ts`
- **Changes**:
  - In `motion-engine.ts`:
    - Set `floorRx = width * 0.46` (removing 920 cap).
    - Set `floorRy = Math.min(height * 0.38, height / 2 - 45)`.
    - Enhance `computeTargetHeat`: faster saturation at $\tau = 9$, stronger heat response up to 1.0.
  - In `hearth-flame.ts`:
    - Scale logs, stones, and ash bed by ~25%.
    - Scale flame tongue heights and widths with noticeable heat expansion (`0.85 + ... + clampedHeat * 0.75`).
    - Scale light pool on the ground to match the wider clearing.
  - In `hearth-words.ts`:
    - Increase font size to 20px / 22px bold JetBrains Mono.

### Task 3: Semantic Phrase Slicing for Conversational Speech
- **Files**:
  - `src/domain/phrase-distiller.ts`
  - `src/hooks/useSalonSpeech.ts`
  - `src/domain/lexicon-engine.ts`
- **Changes**:
  - Implement `splitIntoSemanticPhrases(text: string, maxWordsPerPhrase?: number): string[]`.
  - In `useSalonSpeech.ts`: when a long thought arrives, slice it into semantic sub-phrases and add each non-filler phrase to the clearing with the speaker's seat.

### Task 4: Verification & Cycle Completion
- Run test suites (`npm test`, `npm run typecheck`, `npm run build`).
- Ensure all files in `src/` $\le 250$ lines (AP-019).
- Restart `salon-presence` in PM2 and commit/push.
