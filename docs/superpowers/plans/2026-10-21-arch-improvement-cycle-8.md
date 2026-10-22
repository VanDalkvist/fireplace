# Architecture Improvement Plan - Cycle 8: Pluggable Dual-Engine STT Architecture (Whisper vs Google)

- **Cycle:** 8
- **Goal:** Реализовать каноническую архитектуру портов и адаптеров (AP-010) для распознавания речи: общий интерфейс `SpeechEnginePort`, независимые адаптеры `GoogleSpeechAdapter` и `WhisperSpeechAdapter`, фабрику `createSpeechEngine` и конфигурационный переключатель `sttEngine` (с сохранением единого API и идентичного UI-показа).
- **Standards:** `arch-rules.md` (AP-010..AP-071), `arch-improvement-loop` (FSM S0..S12).
- **Target Line Count:** Каждый файл $\le 250$ строк (AP-019).
- **Target Quality:** 0 ошибок `tsc`, 0 циклов `madge`, 100% зеленые детерминированные тесты Vitest.

---

## Planned Slices

### Slice 1: Интерфейс порта и Google Speech Adapter
- **Boundary:** Speech / Domain Port (`src/speech/speech-types.ts`, `src/speech/google-speech-adapter.ts`)
- **AP Gates:** AP-010, AP-018, AP-019
- **Tasks:**
  1. Выделить канонический интерфейс `SpeechEnginePort` в `src/speech/speech-types.ts`.
  2. Оформить `GoogleSpeechAdapter` как реализацию `SpeechEnginePort` ($\le 180$ строк).
  3. Покрыть тестами `tests/google-speech-adapter.test.ts`.

### Slice 2: Локальный Whisper Speech Adapter
- **Boundary:** Speech / Infrastructure Adapter (`src/speech/whisper-speech-adapter.ts`)
- **AP Gates:** AP-010, AP-018, AP-019, AP-071
- **Tasks:**
  1. Создать `WhisperSpeechAdapter` ($\le 170$ строк):
     - Реализует `SpeechEnginePort`.
     - Использует `StreamRecorder` + `transcribeAudioBlob`.
     - Чанкинг и детекция пауз $\ge 4.5$ сек, поддержка `flush()`.
  2. Покрыть тестами `tests/whisper-speech-adapter.test.ts`.

### Slice 3: Фабрика движков и переключатель в UI
- **Boundary:** Presentation & Composition Root (`src/speech/speech-factory.ts`, `src/components/SalonExperience.tsx`, `src/components/salon/SalonControls.tsx`)
- **AP Gates:** AP-010, AP-019 (<= 250 lines), AP-020, AP-054, AP-064
- **Tasks:**
  1. Создать `src/speech/speech-factory.ts` (`createSpeechEngine(kind, callbacks)`).
  2. В `SalonControls.tsx` и `VoiceIndicator.tsx` добавить переключатель движков (`[whisper | google]`).
  3. Подключить в `SalonExperience.tsx` с поддержкой URL-параметра `?stt=whisper` / `?stt=google`.
  4. Сохранить лимит `SalonExperience.tsx` строго $\le 250$ строк.

### Slice 4: Двухконтурная верификация S9
- **Verification:**
  1. `bun run test` (все тесты зеленые).
  2. `bun run typecheck` (0 ошибок).
  3. `wc -l` по всем файлам $\le 250$ строк.
  4. `npx madge --circular` (0 циклов).
  5. Проверка переключения на живом стенде.
