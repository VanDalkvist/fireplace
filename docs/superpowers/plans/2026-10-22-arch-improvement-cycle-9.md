# Architecture Improvement Plan - Cycle 9: Zero-Loss Continuous Open Mic & Notion-Style Realtime Neural Repair

- **Cycle:** 9
- **Goal:** Реализовать созерцательный режим непрерывного микрофона (Open Mic) без самопроизвольного выключения и потоковую двухпроходную нейрокоррекцию речи (Notion-Style Realtime Pipeline) с нулевой потерей звука (Zero Audio Loss) на базе лучших архитектурных паттернов чистого кода.
- **Standards:** `arch-rules.md` (AP-010..AP-071), `arch-improvement-loop` (FSM S0..S12), `arch-rules-slice-planning`, `superpowers:writing-plans`.
- **Target Line Count:** Каждый файл строго $\le 250$ строк (AP-019).
- **Target Quality:** 0 ошибок `tsc`, 0 циклов `madge`, 100% зеленые детерминированные тесты Vitest.

---

## 1. Обязательные архитектурные паттерны (Mandatory Architecture Patterns)

В реализацию Cycle 9 закладываются 6 канонических архитектурных паттернов:

1. **Pipes & Filters (Каналы и фильтры — AP-010, AP-018):**
   * Пайплайн обработки речи разбивается на изолированные, независимые фильтры с четкими DTO-контрактами:
     `AudioStream` $\to$ `[AudioRingBuffer]` $\to$ `AudioChunk` $\to$ `[WhisperFilter]` $\to$ `RawText` $\to$ `[QwenRefinementFilter]` $\to$ `CrystallizedFeeling` $\to$ `[HearthEventBus]`.
   * Каждый фильтр тестируется отдельно в изоляции, без завязки на React и Canvas.

2. **Circular Ring Buffer with Overlap (Кольцевой буфер с захлёстом — AP-018, AP-023):**
   * Запись аудио ведется через циклический буфер фиксированной емкости с защитой от переполнения памяти.
   * Извлечение речевого сегмента происходит с детерминированным захлёстом (300 мс overlap) для исключения обрезания звуков на стыках.

3. **Producer-Consumer Queue with Backpressure (Очередь с изоляцией нагрузки — AP-012, AP-023):**
   * **Producer (High Priority):** Фоновый захват `MediaRecorder` с шагом 250 мс работает непрерывно и никогда не блокируется сетевыми вызовами.
   * **Consumer (Async Worker):** Whisper и Qwen обрабатывают сегменты из очереди асинхронно. Задержка инференса (100–300 мс) никак не влияет на плавность записи следующей фразы.

4. **Two-Phase Optimistic Morphing (Двухфазное оптимистичное обновление — AP-052, AP-054):**
   * **Фаза 1 (Спекулятивная):** Сырые промежуточные слова немедленно отображаются в UI (Pass 1 — живой отклик «я тебя слышу»).
   * **Фаза 2 (Каноническая):** По завершении паузы нейросеть возвращает исправленный текст и точное чувство. Текст в UI бесшовно трансформируется (*in-place morphing*), устраняя опечатки ASR, и мягко улетает к костру.

5. **Circuit Breaker & Fallback Chain (Предохранитель и каскадный откат — AP-012, AP-044):**
   * Если локальный Whisper или Ollama не отвечают в течение сторожевого тайм-аута (Circuit Open), пайплайн не падает с крэшем и не глушит микрофон, а плавно деградирует до прямого текста или словарного экстрактора с предупреждением в UI.

6. **Disposable / RAII Pattern (Строгое управление жизненным циклом ресурсов — AP-023, AP-070):**
   * Все аудиотреки, таймеры, воркеры и подписки реализуют единый метод `dispose()` / `cleanup()`, гарантируя 0 утечек памяти при многочасовых сессиях.

---

## 2. Invariants & Zero-Loss Proofs

### Инвариант 1: Запись никогда не останавливается на время инференса (Zero Gap)
- `mediaRecorder.start(250)` непрерывно отдает бинарные чанки каждые 250 мс на аппаратном уровне браузера.
- Извлечение фразы происходит методом `extractCurrentSegment(keepOverlapMs = 300)`: возвращается `Blob` накопленного сегмента, а текущий буфер сбрасывается с сохранением последних 300 мс в качестве преамбулы следующего сегмента.
- Метод `mediaRecorder.stop()` **запрещено вызывать для нарезки фраз**.

### Инвариант 2: Созерцательный Open Mic
- События `onFinalPhrase`, ответ от Whisper или завершение работы Qwen **не имеют права сбрасывать `isListeningActive`**.
- Микрофон выключается только по прямому действию пользователя (`toggle()`, клик по кнопке `голос (v)`, хоткей `v`).
- Между репликами микрофон непрерывно слушает пространство круга.

---

## 3. Implementation Slices

### Slice 1: Circular Ring Buffer & Continuous Stream Recorder (`src/speech/stream-recorder.ts`)
- **Patterns:** Circular Ring Buffer, Producer-Consumer, Disposable
- **Boundary:** Speech / Audio Capture Infrastructure
- **AP Gates:** AP-010, AP-018, AP-019 ($\le 250$ строк), AP-023
- **Tasks:**
  1. Реализовать `AudioRingBuffer` внутри `stream-recorder.ts` с защитой от переполнения и поддержкой скользящего окна.
  2. Метод `start(stream, timesliceMs = 250)` — непрерывный аппаратный сбор чанков.
  3. Метод `extractCurrentSegment(overlapMs = 300): Blob` — атомарный срез сегмента с сохранением overlap-хвоста без прерывания записи.
  4. Написать юнит-тесты в `tests/stream-recorder.test.ts` (проверка continuous-режима, overlap и `dispose()`).

### Slice 2: Non-blocking Continuous Whisper Adapter (`src/speech/whisper-speech-adapter.ts`)
- **Patterns:** Pipes & Filters, Circuit Breaker, Strategy
- **Boundary:** Speech / Infrastructure Adapter
- **AP Gates:** AP-010, AP-012, AP-018, AP-019, AP-054, AP-071
- **Tasks:**
  1. Реализовать непрерывный цикл распознавания:
     - `start()` запускает непрерывный сбор в `StreamRecorder`.
     - Детектор пауз (4500 мс): по истечении тишины забирает срез через `extractCurrentSegment(300)` и асинхронно отправляет в `whisper-server` (порт 8085) **без остановки записи микрофона**.
     - `flush()`: мгновенный сброс текущего среза при смене говорящего.
     - Circuit Breaker: при сетевой ошибке Whisper или задержке $>3000$ мс фиксирует сбой без отключения микрофона.
  2. Написать юнит-тесты в `tests/whisper-speech-adapter.test.ts`.

### Slice 3: Two-Pass Qwen Neural Corrector & Distiller (`src/domain/phrase-distiller.ts`)
- **Patterns:** Pipes & Filters, Two-Phase Refinement
- **Boundary:** Domain / Semantic Adapter
- **AP Gates:** AP-012, AP-018, AP-019, AP-071
- **Tasks:**
  1. Реализовать контракт `RefinedSpeechPayload`:
     ```typescript
     export interface EnrichedDistillationResult extends DistillationResult {
       repairedText?: string;
       neuralDistilled?: boolean;
       engineUsed: "qwen2.5:1.5b" | "qwen2.5:0.5b" | "lexicon-fallback";
     }
     ```
  2. Настроить промпт для Qwen 1.5B на исправление фонетических опечаток ASR (*«покою огня»* $\to$ *«покой у огня»*) и одновременное сохранение сокровенной метафоры/чувства.
  3. Санитарный гейт против утечки шаблона и тесты в `tests/phrase-distiller.test.ts`.

### Slice 4: Two-Phase Optimistic UI & In-Place Word Morphing (`SalonExperience.tsx`, `VoiceIndicator.tsx`)
- **Patterns:** Optimistic UI, Two-Phase Morphing, Clean Composition Root
- **Boundary:** Presentation / UI Overlay
- **AP Gates:** AP-018, AP-019 ($\le 250$ строк), AP-020, AP-052, AP-054, AP-064
- **Tasks:**
  1. В `VoiceIndicator.tsx`:
     - Фаза 1: отображение текущих сырых слов речи (курсив, мягкая пульсация).
     - Фаза 2: мягкое замещение исправленным текстом (`repairedText`) на 350 мс перед отправкой к костру.
  2. В `SalonExperience.tsx`:
     - Режим Open Mic: микрофон активен непрерывно, не тухнет после добавления слова.
     - Строгий аудит лимита строк: `SalonExperience.tsx` $\le 250$ строк.

### Slice 5: Двухконтурная верификация S9 (Dual-Circuit Gate)
- **Verification:**
  1. `bun run test` (100% зеленые детерминированные тесты).
  2. `bun run typecheck` (0 ошибок, 0 any).
  3. `wc -l` по всем файлам `src/` (все $\le 250$ строк).
  4. `npx madge --circular src/` (0 циклов).
  5. Проверка на живом стенде: сказать 3 фразы подряд без пауз и кликов, подтвердить непрерывный зеленый Open Mic и отсутствие потерь.
  6. Обновление `docs/arch-improvement/review-log.md`, коммит и пуш в git, запись в GBrain.
