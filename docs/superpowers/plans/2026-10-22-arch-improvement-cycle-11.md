# Architecture Improvement Plan - Cycle 11: Hook Stabilization, Stream Ownership & Clean Infrastructure

- **Cycle:** 11
- **Goal:** Устранить все находки [P1] и [P2], выявленные независимым аудитом в Cycle 10:
  1. [P1] Стабилизировать зависимости хуков `useSalonSession` и `useSalonSpeech`: предотвратить самопроизвольный срыв Open Mic при смене спикера / передаче хода.
  2. [P1] Синхронизировать жизненный цикл `WhisperSpeechAdapter`: при сетевой ошибке сбрасывать `isListeningActive` и останавливать фоновые таймеры.
  3. [P1] Внедрить владение аудиостримами в `StreamRecorder`: не убивать чужие треки (`meetingStream`) при `cleanup()`.
  4. [P2] Автоматически переключать STT на `whisper` при активации звука звонка Zoom/Meet.
  5. [P2] Добавить `track.onended` в `SalonAudioEngine` для отслеживания системного отключения шеринга экрана.
  6. [P2] Вынести сетевые вызовы Ollama из доменного слоя в `src/infrastructure/ollama-client.ts` (AP-010).
  7. [P2] Добавить unmount cleanup в `useSalonSpeech` и структурированное логирование во все пустые `catch` блоки (AP-022, AP-023).
- **Target Line Count:** Каждый файл строго $\le 250$ строк (AP-019).
- **Target Quality:** 0 ошибок `tsc`, 0 циклов `madge`, 100% зеленые детерминированные тесты Vitest.

---

## Planned Slices

### Slice 1: Стабилизация зависимостей хуков (`useSalonSession.ts`, `useSalonSpeech.ts`)
- **AP Gates:** AP-018, AP-020, AP-053, AP-054
- **Tasks:**
  - В `useSalonSession`: убрать `state.activeSpeakerId` из зависимостей `handleAddFeeling`, `handleAddDesire`, `handlePass` (использовать функциональный `setState((prev) => ...)`).
  - В `useSalonSpeech`: закрепить коллбэки (`onPass`, `onAddFeeling`, `onAddDesire`, `phase`) через `useRef` / stable dispatch, чтобы `handleSpeechResult` имел постоянную ссылку.
  - В `useEffect` создания движка: создавать движок только при реальной смене `sttEngine`, не пересоздавать при смене стейта сессии.
  - Добавить unmount cleanup: `return () => { void speechRef.current?.stop(); }`.

### Slice 2: Устранение рассинхронизации стейта в `WhisperSpeechAdapter` (`src/speech/whisper-speech-adapter.ts`)
- **AP Gates:** AP-012, AP-018, AP-023
- **Tasks:**
  - В методе `processCurrentSegment`: при ошибке сети сбрасывать `this.isListeningActive = false`, останавливать `this.silenceTimer`.
  - Удалить неиспользуемое поле `chunkInterval` и мертвый параметр `isExplicitFlush`.
  - Добавить тесты на корректное завершение при сбое Whisper в `tests/whisper-speech-adapter.test.ts`.

### Slice 3: Владение стримами и слушатель `onended` (`StreamRecorder`, `audio-engine.ts`)
- **AP Gates:** AP-018, AP-023, AP-054
- **Tasks:**
  - В `StreamRecorder`: добавить флаг `ownsStream: boolean`. Если стрим передан снаружи (`stream !== undefined`), `cleanup()` не вызывает `track.stop()`.
  - В `SalonAudioEngine.captureMeetingAudio`: подписаться на `track.addEventListener('ended', ...)` для сброса состояния при системном закрытии шеринга в браузере.
  - Покрыть тестами в `tests/stream-recorder.test.ts`.

### Slice 4: Вынос Ollama в слой Infrastructure & утилизация AP-022
- **AP Gates:** AP-010, AP-020, AP-022
- **Tasks:**
  - Создать `src/infrastructure/ollama-client.ts` ($\le 90$ строк): инкапсулировать вызовы `/api/generate` и `/api/tags` с обработкой ошибок.
  - Отрефакторить `src/domain/phrase-distiller.ts`: использовать `ollama-client`. Заменить остаточный дефолт `"спокойствие"` на `"живость"`.
  - Заменить все пустые `catch {}` на `console.warn` в соответствии с AP-022.

### Slice 5: Двухконтурная верификация S9
- Запуск тестов, `tsc`, проверка лимитов строк $\le 250$, madge и живой прогон в headless Chrome.
