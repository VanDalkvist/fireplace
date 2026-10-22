# Architecture Improvement Plan - Cycle 32: Fix ASR 422 Format Error & Verbatim Phrase Mode

## Goal
1. Permanently eliminate the `HTTP 422: Transcription failed. Check audio format` error on Sber GigaAM by preserving WebM container headers during silence shifting and adding automatic Whisper fallback.
2. Replace raw technical JSON error modals with quiet, presence-respecting error handling.
3. Add a "Verbatim / Целиком" mode: recognized phrases appear directly in the campfire clearing in full without neural distillation or lexical compression.
4. Expose the Verbatim mode toggle in the control panel (`SalonPult`) and bottom controls (`SalonControls`).

## Architecture Context Map
- `src/speech/stream-recorder.ts`: Manages MediaRecorder, pre-roll chunks, and container header preservation.
- `src/speech/openai-speech-client.ts`: Dispatches audio to `/v1/audio/transcriptions` with automatic Whisper fallback on 422/500.
- `src/speech/whisper-speech-adapter.ts`: Handles speech pipeline transitions and quiet error logging.
- `src/hooks/useSalonUiState.ts`: Manages `isVerbatimMode` state (persisted in localStorage).
- `src/hooks/useSalonSpeech.ts`: Bypasses distillation when `isVerbatimMode` is enabled.
- `src/components/salon/SalonPult.tsx`: Adds Verbatim mode toggle.
- `src/components/salon/SalonControls.tsx`: Adds quick toggle button.

---

## Tasks & Fix Slices (TDD)

### Task 1: Fix StreamRecorder WebM Container Integrity (TDD)
- [ ] In `tests/stream-recorder.test.ts`: add a test verifying that even when silence shifting occurs, the extracted Blob ALWAYS starts with the container header chunk.
- [ ] In `src/speech/stream-recorder.ts`:
  - Store `headerChunk` on first chunk arrival.
  - Prepend `headerChunk` in `onstop` if ring buffer was shifted.
  - Bounded silence restart every 1.5s to ensure clean cluster boundaries.

### Task 2: Automatic ASR Fallback & Quiet Error Handling
- [ ] In `src/speech/openai-speech-client.ts`: if primary ASR returns 422/500, attempt secondary fallback (Whisper on port 8085).
- [ ] In `src/speech/whisper-speech-adapter.ts` and `src/components/salon/VoiceIndicator.tsx`:
  - Clean error formatting (avoid dumping raw JSON `{"code":"transcription_error",...}`).

### Task 3: Verbatim Phrase Mode ("Целиком")
- [ ] In `tests/use-salon-speech.test.ts` (or speech tests): verify that `isVerbatimMode` skips distillation.
- [ ] In `src/hooks/useSalonUiState.ts`: add `isVerbatimMode` and `setIsVerbatimMode` with `localStorage` persistence.
- [ ] In `src/hooks/useSalonSpeech.ts`: accept `isVerbatimMode` and bypass `distillWithNeuralFallback`.
- [ ] In `src/components/salon/SalonPult.tsx` & `SalonControls.tsx`: add UI toggle.

### Task 4: Verification, Ledger & PM2 Restart
- [ ] Full Vitest suite (`npm test`), TypeScript check (`npm run typecheck`), build (`npm run build`).
- [ ] Line counts $\le 250$ lines (AP-019).
- [ ] Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- [ ] Commit, push to `origin/main`, restart PM2 `salon-presence`, and write back to GBrain.
