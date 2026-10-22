# Architecture Improvement Plan - Cycle 12: Autonomous Acoustic Speaker Identification & Zero-Click Voice Driving (sherpa-onnx TS)

- **Cycle:** 12
- **Goal:** Полностью ликвидировать ручные клики мышью для смены спикеров («Все клики уничтожаем. Либо оно работает, либо не работает»). Перевести круг практики присутствия на 100% автономное акустическое распознавание говорящих по вектору тембра (Voiceprint CAM++):
  1. **Отказ от Python в пользу чистого TypeScript / Node.js:**
     - Вместо отдельного тяжелого Python-окружения (`pip`, `uv`, `venv`) использовать нативный аддон `sherpa-onnx-node` + `sherpa-onnx-darwin-arm64` на Bun/Node.
     - Быстрый, легковесный сервис `sherpa-speaker-service` на порту 8086 с задержкой инференса $< 25$ мс.
  2. **Параллельный контур в реальном времени (Pipes & Filters — AP-012, AP-018):**
     - При финализации голосового отрезка аудио отправляется одновременно в два независимых порта через `Promise.all`:
       1) `whisperClient.transcribeAudioBlob(blob)` $\to$ расшифровка текста речи (порт 8085).
       2) `speakerPort.identify(blob)` $\to$ извлечение 192-мерного эмбеддинга CAM++ и сопоставление со стулом участника (порт 8086).
     - Нулевая дополнительная задержка: время распознавания спикера ($< 25$ мс) полностью маскируется временем транскрипции Whisper (~500 мс).
  3. **Автономное переключение спикеров (Zero Clicks — AP-054):**
     - Голос участника автоматически активирует его стул (`activeSpeakerId`) на холсте вокруг костра.
     - Первый говорящий автоматически занимает стул 1 (Host).
     - Каждый новый тембр голоса автоматически бронирует следующий свободный стул (2..12) без кликов.
     - Повторная речь участника мгновенно активирует ранее закрепленный за ним стул.
  4. **Сохранение монолитной модульности и чистоты архитектуры:**
     - Соблюдение стандартов `arch-rules.md` (AP-010..AP-071).
     - Строгий лимит $\le 250$ строк на каждый файл (AP-019).
     - 0 типов `any`, 0 циклов, 100% зеленые детерминированные тесты Vitest.

---

## Architecture Design & Patterns

### 1. Hexagonal Ports & Adapters (AP-010)
```
       [Микрофон / Звонок Zoom]
                  │ (StreamRecorder: 16kHz audio blob)
                  ▼
         [WhisperSpeechAdapter]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
[SpeechEnginePort]   [SpeakerIdentificationPort]
        │                   │
 (whisper-asr: 8085) (sherpa-speaker-service: 8086)
   Text: "покой"       Speaker: seat_3 (score: 0.88)
        └─────────┬─────────┘
                  ▼
       [onFinalPhrase(text, seatId)]
                  │
                  ▼
       [useSalonSpeech / useSalonSession]
                  │
 ┌────────────────┴────────────────┐
 ▼                                 ▼
activeSpeakerId = 3            Qwen 1.5B (Pass 2)
(Стул 3 пульсирует теплом)      Слова летят от стула 3 в огонь
```

### 2. Autonomous Enrollment & Classification FSM
- **State 1 (Clean Circle):** `enrolledCount === 0`.
- **First Voice Arrival:** Вектор тембра сохраняется в менеджер под ключом `seat_1`. Стул 1 активируется.
- **Next Voice Arrival:** Косинусное сходство $S = \frac{v_1 \cdot v_2}{\|v_1\| \|v_2\|}$.
  - Если $S \ge 0.50$ $\to$ `matched: true`, активируется стул существующего участника.
  - Если $S < 0.50$ $\to$ `matched: false`, голос регистрируется на следующий свободный стул (Auto-Enrollment).
- **Reset:** По кнопке или хоткею все отпечатки сбрасываются для нового круга.

---

## Planned Slices

### Slice 1: Автономный сервис `sherpa-speaker-service` на TypeScript / Bun (Port 8086)
- **Scope:** Репозиторий `~/Projects/sherpa-speaker-service`
- **AP Gates:** AP-010, AP-018, AP-019, AP-022, AP-071
- **Tasks:**
  1. Реализовать `src/audio-decoder.ts` ($\le 60$ строк): распаковка входящих WebM/WAV через ffmpeg pipe в 16kHz float32.
  2. Реализовать `src/speaker-engine.ts` ($\le 120$ строк): инкапсуляция `SpeakerEmbeddingExtractor` и `SpeakerEmbeddingManager` (`camplus.onnx`, dim=192).
  3. Реализовать `src/server.ts` ($\le 110$ строк): HTTP сервер на порту 8086 с поддержкой `/health`, `/identify`, `/reset`, `/speakers`.
  4. Добавить юнит-тесты в `tests/speaker-engine.test.ts`.
  5. Запустить в PM2 (`sherpa-speaker`), зарегистрировать сабмодуль и запись в `registry.json`.

### Slice 2: Порты и адаптеры биометрии в `salon-presence` (`src/speaker/`)
- **Scope:** `salon-presence/src/speaker/`
- **AP Gates:** AP-010, AP-012 (Circuit Breaker), AP-018, AP-019
- **Tasks:**
  1. `src/speaker/speaker-types.ts` ($\le 30$ строк): контракт `SpeakerIdentificationPort`, DTO `SpeakerIdentificationResult`.
  2. `src/speaker/sherpa-speaker-adapter.ts` ($\le 110$ строк): реализация HTTP клиента с тайм-аутом 2000 мс, AbortController и безопасной деградацией.
  3. `src/speaker/speaker-factory.ts` ($\le 20$ строк): фабрика создания адаптера.
  4. Юнит-тесты `tests/speaker-adapter.test.ts` (100% зеленые).

### Slice 3: Параллельный пайплайн распознавания речи и голоса (Zero-Click Turn Taking)
- **Scope:** `src/speech/whisper-speech-adapter.ts`, `src/hooks/useSalonSpeech.ts`, `src/components/SalonExperience.tsx`
- **AP Gates:** AP-010, AP-018, AP-054
- **Tasks:**
  1. В `WhisperSpeechAdapter`: запуск `Promise.all([ transcribeAudioBlob(blob), speakerPort.identify(blob) ])`. Передача `seatNumber` в `onFinalPhrase(text, seatNumber)`.
  2. В `useSalonSpeech.ts`: при получении `seatNumber` вызывать `callbacksRef.current.onSelectSpeaker?.(seatNumber)` — стул говорящего переключается **автоматически**.
  3. В `useSalonSession.ts`: переданный `seatNumber` связывается с `handleAddFeeling` / `handleAddDesire`, слова летят именно от стула говорящего.
  4. В `VoiceIndicator.tsx`: отображение статуса распознавания голоса: `участник 04 · голос распознан`.
  5. В `SalonControls.tsx` / `SalonPult.tsx`: кнопка `сброс голосов` (очистка отпечатков для нового круга практики).
  6. Ликвидация необходимости кликать по стульям.

### Slice 4: Двухконтурная верификация S9
- **Tasks:**
  1. `bun run test` (все тесты зеленые, добавлены тесты параллельного пайплайна).
  2. `bun run typecheck` (`tsc --noEmit` 0 ошибок, 0 any).
  3. Проверка лимитов строк `wc -l` ($\le 250$ строк).
  4. `madge --circular` (0 циклов).
  5. Автономное ревью независимого субагента Gemini 3.8 High (`bb thread spawn`).
