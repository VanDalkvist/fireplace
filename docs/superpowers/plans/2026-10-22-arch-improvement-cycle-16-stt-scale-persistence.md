# Arch Improvement Cycle 16: Robust STT, Hearth Expansion, Full Persistence & PM2 Client Logging

## Goal
Resolve speech inference HTTP 400 failures, expand hearth and word visual scale, implement complete session & word position persistence across page reloads, and establish unified client-to-PM2 debug logging.

## Root Cause Analysis (Inference HTTP 400)
`whisper-server` (whisper.cpp) was started without `--convert`. Without `--convert`, `whisper-server` only accepts raw WAV via `dr_wav` C library. When browser sends `audio/webm;codecs=opus`, `dr_wav` fails (`error: failed to decode audio data from memory buffer`) and returns HTTP 400 Bad Request.
Fix:
1. Start `whisper-asr` in PM2 with `--convert --tmp-dir /tmp`.
2. In `salon-presence`, add client-side WAV transcoding or fallback, and ensure `whisper-client.ts` sends complete valid headers.

## Plan Slices

### Slice 1: Client Log Pipeline to PM2 (`vite.config.ts` & `client-logger.ts`)
- Implement `clientLoggerPlugin` in `vite.config.ts` handling `POST /api/client-log` and writing to `console.log` / `console.error` (captured by PM2).
- Create `src/infrastructure/client-logger.ts` with structured logging (`logClientError`, `logClientWarn`, `logClientInfo`).
- Connect `useSalonSpeech`, `whisper-speech-adapter`, and `stream-recorder` to log errors through `client-logger`.
- Unit test for `client-logger.ts`.

### Slice 2: Robust Audio Transcription & WAV Encoding
- Ensure `whisper-client.ts` handles errors with clear diagnostic messages sent to client logger.
- Add client-side in-memory WAV encoder (`src/speech/wav-encoder.ts`) so if needed, audio can be delivered as pure 16kHz PCM WAV directly, guaranteeing 100% compatibility with any whisper.cpp configuration.
- Update `whisper-asr` PM2 process definition with `--convert --tmp-dir /tmp`.
- Unit tests for `wav-encoder.ts` and `whisper-client.ts`.

### Slice 3: Expanded Hearth & Larger Typography
- In `src/canvas/motion-engine.ts`, expand clearing radii: `floorRx` up to 880px, `floorRy` up to 400px.
- In `src/canvas/hearth-words.ts`, increase word font to `17px 'JetBrains Mono'` (or bold 18px for active speaker), expand sacred fire clearance around campfire from 135px to 160px.
- Unit tests verifying clearance and layout bounds.

### Slice 4: Full State & Word Position Persistence Across Reloads
- Create `src/infrastructure/salon-persistence.ts`:
  - `saveSessionState(state)` and `loadSessionState()`: feelings, desires, participants, active speaker.
  - `saveHearthWords(words)` and `loadHearthWords()`: words array with `x, y, targetX, targetY, settled, opacity, count, text, family`.
  - `clearSessionPersistence()`: called on «новый круг» (Reset).
- Integrate hydration into `useSalonSession.ts` and `SalonMotionEngine.ts`.
- Unit tests in `tests/salon-persistence.test.ts`.

### Slice 5: Verification & Ledger Update (No subagents per user directive)
- Run `bun run test`, `bun run typecheck`, `npx madge --circular --extensions ts,tsx src/`, `wc -l`.
- Build with `bun run build` and restart PM2.
- Document Cycle 16 in `docs/arch-improvement/review-log.md`.
