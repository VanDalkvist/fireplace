# Arch Improvement Cycle 18: Fixing Audio Capture, Zoom Capture, VAD Gate & Speech Resilience

Date: 2026-10-22
Author: Lead Agent & Vanya
Status: Approved

## Context & Objectives
- Architecture Context Map: MVP/Prod, AP-010 (Ports & Adapters), AP-012 (Fail-Fast & Resilient Recovery), AP-019 (Lines <= 250), AP-023 (Async Discipline), AP-027 (Fail-Safe Config), AP-054 (Robust UI States).
- Problem:
  - Приложение не забирает и не распознает внешние голоса из Zoom.
  - `AudioContext` в `StreamRecorder` стартует в состоянии `suspended`, RMS возвращает 0.
  - VAD-гейт в `WhisperSpeechAdapter` молча отбрасывает аудиосегменты как "тишину".
  - Chrome AEC (Echo Cancellation) по умолчанию вырезает голоса из динамиков ноутбука.
  - В `MeetingAudioCapture` вызов `getVideoTracks().forEach(t => t.stop())` в современных версиях Chromium может приводить к закрытию всего `MediaStream`.
  - При переключении STT-движка на лету микрофон засыпает без автоматического перезапуска.
  - Единичная ошибка ASR-запроса намертво глушит прослушивание.

---

## Findings Selected for Fix-Now

- [P0] VAD Silent Drop & Suspended AudioContext
  - Evidence: `src/speech/stream-recorder.ts`: `audioContext` создается без `resume()`. `hasSpeechInCurrentSegment()` возвращает `false`, из-за чего `processCurrentSegment()` в `whisper-speech-adapter.ts:47` молча делает `return`, не отправляя звук на сервер.
  - Impact: Звук с микрофона и Zoom вообще не попадает в ASR.
  - Rule: AP-012, AP-054
  - Fix decision: fix-now

- [P1] Acoustic Echo Cancellation (AEC) cancels Zoom speakers
  - Evidence: `src/speech/stream-recorder.ts:31`: `getUserMedia({ audio: true })` включает дефолтный шумодав и эхоподавление Chrome, которые распознают звук из динамиков как эхо и вырезают речь из Zoom.
  - Impact: Голоса участников конференции не попадают в микрофон.
  - Rule: AP-054
  - Fix decision: fix-now

- [P1] DisplayMedia stream killed on video track stop
  - Evidence: `src/audio/meeting-audio-capture.ts:16`: `stream.getVideoTracks().forEach((t) => t.stop())` в Chrome 120+ на macOS переводит весь захват экрана в состояние `ended`.
  - Impact: Режим «Встреча (Zoom)» немедленно отключается после выбора экрана.
  - Rule: AP-012, AP-054
  - Fix decision: fix-now

- [P1] Engine Hot-Swap Desync
  - Evidence: `src/hooks/useSalonSpeech.ts:145`: При смене `sttEngine` вызывается `.stop()`, создается новый движок, но `.start()` не вызывается.
  - Impact: Рассинхрон состояния: кнопка микрофона считает, что слушает, а движок выключен.
  - Rule: AP-054
  - Fix decision: fix-now

- [P1] Single ASR error terminates listening loop
  - Evidence: `src/speech/whisper-speech-adapter.ts:80`: Блок `catch (err)` безусловно выставляет `isListeningActive = false`, останавливая прослушивание.
  - Impact: Сессия практики срывается при любом сетевом лаге.
  - Rule: AP-012
  - Fix decision: fix-now

---

## Implementation Slices

### Slice 1: AudioContext Resume & Continuous RMS Envelope in StreamRecorder
- **Boundary**: Speech Infrastructure (`src/speech/stream-recorder.ts`).
- **AP Gates**: AP-012, AP-019, AP-023.
- **Red Test First**: `tests/stream-recorder.test.ts`:
  - Проверка вызова `audioContext.resume()`.
  - Проверка, что при получении чанков с ненулевым размером и низким фоновым RMS порог чувствительности адаптируется (adaptive threshold $\ge 0.003$).
  - Проверка, что `getUserMedia` запрашивает аудио с `echoCancellation: false` при захвате звука комнаты.
- **Implementation**:
  - Обновить `src/speech/stream-recorder.ts` (<= 240 строк).

### Slice 2: Resilient Processing in WhisperSpeechAdapter
- **Boundary**: Speech Adapter (`src/speech/whisper-speech-adapter.ts`).
- **AP Gates**: AP-012, AP-019, AP-022.
- **Red Test First**: `tests/whisper-speech-adapter.test.ts`:
  - Проверка, что при единичном сетевом сбое ASR прослушивание НЕ выключается, а silenceTimer перезапускается (счетчик последовательных ошибок $\le 3$).
  - Проверка логирования в `clientLogger` факта обработки/пропуска сегмента.
- **Implementation**:
  - Обновить `src/speech/whisper-speech-adapter.ts` (<= 200 строк).

### Slice 3: Safe MeetingAudioCapture (Zoom screen/audio)
- **Boundary**: Audio Capture (`src/audio/meeting-audio-capture.ts`).
- **AP Gates**: AP-012, AP-019.
- **Red Test First**: `tests/meeting-audio.test.ts`:
  - Проверка, что видео-треки отключаются (`track.enabled = false`), а не убиваются через `stop()`, сохраняя аудио-трек живым.
- **Implementation**:
  - Обновить `src/audio/meeting-audio-capture.ts` (<= 120 строк).

### Slice 4: Seamless Engine Hot-Reload in useSalonSpeech
- **Boundary**: Hook / UI State (`src/hooks/useSalonSpeech.ts`).
- **AP Gates**: AP-019, AP-054.
- **Implementation**:
  - Сохранять флаг `wasListening` перед сменой движка и автоматически вызывать `.start(activeStream)` на новом движке.

---

## Verification (S9 Dual-Circuit Gate)
- 93+ тестов Vitest GREEN.
- `tsc --noEmit` 0 ошибок.
- `madge --circular src/` 0 циклов.
- Все файлы $\le 250$ строк (AP-019).
- Проверка в реальном браузере: живой захват звука, индикация RMS в логах PM2.
