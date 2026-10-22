# Architecture Improvement Plan - Cycle 10: Real Hardware VAD, Meeting Audio Pipeline & Clean Session Decomposition

- **Cycle:** 10
- **Goal:** Полностью устранить все выявленные независимым аудитом дефекты и фальсификации:
  1. Внедрить честный аппаратный Voice Activity Detection (RMS VAD) в `StreamRecorder`: исключить спам тишины и галлюцинации Whisper.
  2. Реализовать сквозной захват звука звонка Zoom/Meet: кнопка в UI, получение `meetingStream` из `SalonAudioEngine` и передача в `WhisperSpeechAdapter`.
  3. Устранить визуальный откат к старой фразе во время инференса LLM: промежуточный текст держится в UI до прихода ответа от Qwen.
  4. Ликвидировать подмену чувств на `"спокойствие"` (AP-013): сохранять аутентичный текст участника.
  5. Декомпозировать `SalonExperience.tsx`: вынести сессионную логику в `src/hooks/useSalonSession.ts` (AP-010, AP-019, AP-020), убрать сжатие строк.
- **Standards:** `arch-rules.md` (AP-010..AP-071), `arch-improvement-loop` (FSM S0..S12).
- **Target Line Count:** Каждый файл строго $\le 250$ строк (AP-019).
- **Target Quality:** 0 ошибок `tsc`, 0 циклов `madge`, 100% зеленые детерминированные тесты Vitest.

---

## Planned Slices

### Slice 1: Честный аппаратный VAD в `StreamRecorder` (`src/speech/stream-recorder.ts`)
- **Boundary:** Speech / Audio Ingestion
- **AP Gates:** AP-012 (Fail-fast), AP-018 (Single responsibility), AP-019
- **Tasks:**
  1. Подключить `AudioContext` + `AnalyserNode` к входному `MediaStream` в `StreamRecorder`.
  2. Реализовать расчет энергии голоса: `getCurrentRms(): number`, флаг `hasVoiceActivity: boolean`, таймстемп `lastVoiceTimestamp: number`.
  3. Добавить метод `hasSpeechInCurrentSegment(): boolean` с порогом `rmsThreshold = 0.015`.
  4. Покрыть детерминированными тестами в `tests/stream-recorder.test.ts` (проверка тишины vs речи).

### Slice 2: Исключение спама тишины в `WhisperSpeechAdapter` (`src/speech/whisper-speech-adapter.ts`)
- **Boundary:** Speech / Infrastructure Adapter
- **AP Gates:** AP-012, AP-018, AP-019, AP-071
- **Tasks:**
  1. В `armSilenceTimer()` проверять:
     - Был ли зафиксирован голос человека (`recorder.hasSpeechInCurrentSegment()`).
     - Если голоса не было (тишина в комнате) — очистить накопленный шум, **не отправлять запрос в Whisper**.
     - Если голос был и за ним последовала тишина $\ge 3500$ мс — отправить срез в Whisper.
  2. Поддержать сквозной прием внешнего `MediaStream` (от захвата Zoom/Meet).
  3. Покрыть тестами в `tests/whisper-speech-adapter.test.ts`.

### Slice 3: Сквозной захват звука Zoom/Meet в UI (`SalonAudioEngine`, `SalonControls.tsx`)
- **Boundary:** Presentation & Audio Capture
- **AP Gates:** AP-010, AP-018, AP-019, AP-054
- **Tasks:**
  1. Добавить в `SalonAudioEngine` публичный метод `getMeetingStream(): MediaStream | null`.
  2. В `SalonControls.tsx` добавить кнопку `захват Zoom/Meet` со статусом подключения.
  3. При активации встречи передавать `meetingStream` в `speechEngine.start(meetingStream)`.
  4. В `VoiceIndicator.tsx` выводить бейдж источника: `[звук Zoom 🎙]` vs `[микрофон 🎙]`.

### Slice 4: Декомпозиция сессии в `useSalonSession.ts` и плавный морфинг текста
- **Boundary:** Presentation / Composition Root
- **AP Gates:** AP-010, AP-013, AP-018, AP-019 ($\le 250$ строк), AP-020, AP-054
- **Tasks:**
  1. Создать `src/hooks/useSalonSession.ts` ($\le 160$ строк):
     - Владеет состоянием сессии (`state`, `addFeeling`, `addDesire`, `passTurn`).
     - Устранена подмена на `"спокойствие"`: если эмоция неизвестна, сохраняется исходная фраза со статусом `"живость"`.
  2. В `SalonExperience.tsx` устранить визуальный откат:
     - Не сбрасывать `interimPhrase` до получения ответа от Qwen.
     - Отображать бейдж `[нейрокоррекция...]` во время работы Pass 2.
  3. Сохранить лимит `SalonExperience.tsx` строго $\le 180$ строк без гольфинга.

### Slice 5: Двухконтурная верификация S9
- **Tasks:**
  1. `bun run test` (все тесты зеленые, проверка VAD, тишины, meeting audio).
  2. `bun run typecheck` (0 ошибок, 0 any).
  3. `wc -l` по всем файлам $\le 250$ строк.
  4. `npx madge --circular` (0 циклов).
  5. Проверка на живом стенде: тишина в комнате не вызывает запросов к Whisper, звук Zoom захватывается кнопкой, текст морфится без отката.
