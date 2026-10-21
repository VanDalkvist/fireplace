# Architecture Improvement Plan - Cycle 6: Native Whisper STT Integration (Apple Silicon Metal)

- **Cycle:** 6
- **Goal:** Заменить нестабильный облачный Google Web Speech API на высокоточный локальный Whisper Small с Metal-ускорением на Apple Silicon (`whisper-server` на порту 8085): захват аудио через браузерный `MediaRecorder`, прямая передача в локальный Whisper, обработка как микрофона, так и звука встречи (`getDisplayMedia`), индикация статуса транскрипции в UI.
- **Standards:** `arch-rules.md` (AP-010..AP-071), `arch-improvement-loop` (FSM S0..S12).
- **Target Line Count:** Каждый файл $\le 250$ строк (AP-019).
- **Target Quality:** 0 ошибок `tsc`, 0 циклов `madge`, 100% зеленые детерминированные тесты Vitest.

---

## Planned Slices

### Slice 1: Локальный клиент Whisper (`src/speech/whisper-client.ts`)
- **Boundary:** Speech / Infrastructure Adapter
- **AP Gates:** AP-010, AP-012 (Fail-fast), AP-018, AP-019, AP-071
- **Tasks:**
  1. Создать `src/speech/whisper-client.ts` ($\le 120$ строк):
     - `checkWhisperStatus(url)`: проверка доступности http://127.0.0.1:8085.
     - `transcribeAudioBlob(blob, url)`: отправка `multipart/form-data` на `/inference` и парсинг `{ text }`.
  2. Написать юнит-тесты в `tests/whisper-client.test.ts` (проверка запросов, ответов, обработки ошибок и таймаутов).

### Slice 2: Браузерный рекордер аудиопотоков (`src/speech/stream-recorder.ts`)
- **Boundary:** Speech / Audio Capture
- **AP Gates:** AP-018 (Single responsibility), AP-019, AP-054
- **Tasks:**
  1. Создать `src/speech/stream-recorder.ts` ($\le 130$ строк):
     - Запуск и остановка записи через `MediaRecorder`.
     - Поддержка `MediaStream` из любого источника (микрофон или meeting audio).
     - Сборка Blob (`audio/webm` или `audio/wav`).
  2. Написать юнит-тесты в `tests/stream-recorder.test.ts`.

### Slice 3: Подключение Whisper в SalonExperience и VoiceIndicator
- **Boundary:** Presentation / UI Overlay
- **AP Gates:** AP-018, AP-019 (<= 250 lines), AP-054 (Resilient UI states), AP-064
- **Tasks:**
  1. В `VoiceIndicator.tsx` и `SalonControls.tsx` добавить отображение статуса Whisper (`🎙 whisper: online`).
  2. В `SalonExperience.tsx` объединить запись и локальную транскрипцию Whisper с последующей дистилляцией `qwen2.5:0.5b`.
  3. Сохранить лимит `SalonExperience.tsx` строго $\le 250$ строк.

### Slice 4: Двухконтурная верификация S9
- **Tasks:**
  1. `bun run test` (все тесты зеленые).
  2. `bun run typecheck` (0 ошибок).
  3. `wc -l` по всем файлам $\le 250$ строк.
  4. `npx madge --circular` (0 циклов).
  5. Проверка реального POST запроса аудио в `http://127.0.0.1:8085/inference`.
  6. Обновление `review-log.md`, коммит и пуш в git.
