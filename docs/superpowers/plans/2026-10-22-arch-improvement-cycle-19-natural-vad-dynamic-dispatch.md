# Cycle 19 Implementation Plan: Industrial Adaptive VAD, Sliding-Window Dynamic Dispatch & Live Audio Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rigid 4.5-second timer and naive client VAD with an industrial AssemblyAI-based Adaptive Noise Floor VAD, FluidAudio Sliding-Window Dispatch with Left-Context, and real-time VU meter transparency in Salon Presence.

**Architecture:** Ports & Adapters (AP-010) with a dedicated `VoiceActivityDetectorPort`, clean separation of audio capture (`StreamRecorder`), speech segmentation/dispatch (`WhisperSpeechAdapter`), and reactive UX (`VoiceIndicator`). Zero external WASM or CDN dependencies; 100% local-first and deterministic.

**Tech Stack:** TypeScript (strict, 0 any), Web Audio API (`AnalyserNode`, Float32Array PCM), Vite + React, Tailwind CSS / Lucide icons, Vitest.

---

## 1. Product Scenarios (Acceptance User Journeys)

These scenarios serve as the exact evaluation criteria for Product Review in S9:

### Сценарий 1: «Короткая реплика собеседника» (Natural EOU Pause Detection)
* **Given:** Пользователь включил микрофон (или Zoom-встречу). Индикатор в состоянии ожидания `«слушаю…»`.
* **When:** Собеседник произносит короткую фразу: *«Мне тепло и спокойно»* (длительность ~1.5 с) и замолкает.
* **Then:**
  1. В момент начала речи ободок микрофона мягко вспыхивает зеленым в такт громкости (VU-метр), статус меняется на `«слышу речь…»`.
  2. Первые согласные звуки («м») не проглатываются благодаря Pre-roll буферу (500 мс).
  3. Через 850 мс естественной паузы после окончания фразы сегмент моментально финализируется.
  4. Статус переходит в `«распознаю (GigaAM v3)…»`, запрос уходит на бэкенд без ожидания старого слепого 4.5-секундного таймера.
  5. Слово кристаллизуется и летит к костру, статус возвращается в `«слушаю…»`.

### Сценарий 2: «Непрерывный длинный монолог в Zoom» (Sliding Window with Left Context)
* **Given:** В Zoom спикер делает доклад и непрерывно говорит в течение 25 секунд без длинных пауз.
* **When:** Длительность непрерывной речи достигает защитного потолка 7.0 секунд.
* **Then:**
  1. Система не ждет окончания всего 25-секундного монолога и не взрывает задержку.
  2. Чанк 1 ($0.0\text{с} \dots 7.0\text{с}$) безопасно финализируется и отправляется на ASR.
  3. Чанк 2 ($5.5\text{с} \dots 12.5\text{с}$) забирает с собой 1.5 секунды предыдущего аудио как левый контекст (`leftContext`).
  4. Слово на 7-й секунде **не разрезается посередине слога**.
  5. Каждые 7 секунд у костра стабильно и плавно появляются новые распознанные слова спикера.

### Сценарий 3: «Тихая речь из динамиков ноутбука на фоне комнатного шума» (Adaptive Noise Floor)
* **Given:** В комнате работает кондиционер или шумит вентилятор ноутбука (постоянный фоновый шум).
* **When:** В Zoom тихо говорит участник с тихим микрофоном (RMS ~0.002, чуть выше фона).
* **Then:**
  1. Адаптивный VAD непрерывно калибрует `noiseFloor` по скользящему среднему (EMA), пока тишина.
  2. Порог срабатывания устанавливается как $\text{noiseFloor} \times 2.5$, а не зашит статическим числом `0.015`.
  3. Тихий голос участника уверенно классифицируется как речь (`isSpeaking = true`) и не отбрасывается в мусорку.
  4. При начале речи калибровка шума замораживается, чтобы громкость речи не задирала порог.

### Сценарий 4: «Полная прозрачность звукового тракта для пользователя» (Live Feedback & Diagnostics)
* **Given:** Пользователь включил микрофон, но не понимает, доходит ли звук из Zoom до браузера.
* **When:** Пользователь смотрит на кнопку микрофона `VoiceIndicator`.
* **Then:**
  1. Ободок микрофона пульсирует в реальном времени от фактического уровня входного сигнала (VU-метр). Если ободок не реагирует на речь — пользователь сразу понимает, что системный ввод заглушен.
  2. Если микрофон активен, но абсолютная тишина ($RMS < 0.0005$) длится дольше 8 секунд, появляется деликатная подсказка: `«микрофон включен, но звука нет — проверьте системный ввод»`.
  3. Все переходы состояний конвейера (`idle` $\to$ `hearing` $\to$ `transcribing` $\to$ `distilling`) явно отображаются в интерфейсе.

---

## 2. Архитектурная карта и декомпозиция файлов (AP-010, AP-019)

Чтобы строго уложиться в бюджет $\le 250$ строк (AP-019) и соблюсти чистую инверсию зависимостей (AP-010):

| Файл | Назначение | Оценка строк |
|---|---|---|
| `src/speech/vad/vad-types.ts` | Контракт порта VAD (`VoiceActivityDetectorPort`, DTO результатов) | ~40 строк |
| `src/speech/vad/energy-vad.ts` | Порт адаптивного VAD (AssemblyAI EMA noise floor + hangover) | ~110 строк |
| `src/speech/speech-types.ts` | Расширение контракта SpeechEngine (статусы пайплайна, audioLevel) | ~75 строк |
| `src/speech/stream-recorder.ts` | Рефакторинг: делегирование VAD в `EnergyVad`, поддержка pre-roll (500 мс) и left-context (1.5 с) | ~185 строк (было 249) |
| `src/speech/whisper-speech-adapter.ts` | Умный диспетчер: отправка по EOU паузе (850 мс) или потолку (7.0 с) | ~195 строк |
| `src/components/salon/VoiceIndicator.tsx` | Живой VU-метр (реактивное кольцо) + прозрачные бейджи состояний | ~140 строк |
| `src/hooks/useSalonSpeech.ts` | Проброс `audioLevel` и `pipelineStatus` в компонент отображения | ~190 строк |

Все файлы проекта остаются строго $\le 250$ строк.

---

## 3. Findings Triaged for Fix-Now (AP-Rules)

- **[P1] Rigid Blind 4.5s Audio Slicing (AP-012, AP-013)**
  - Evidence: `src/speech/whisper-speech-adapter.ts:54-61` (`setTimeout(4500)` without silence detection).
  - Impact: Words chopped in half during monologues; unnecessary 3s lag on short phrases.
  - Fix decision: `fix-now`.
- **[P1] Silent VAD Black Hole & Missing Adaptive Noise Floor (AP-012, AP-054)**
  - Evidence: `src/speech/stream-recorder.ts:125` (static RMS threshold ignores quiet Zoom speech).
  - Impact: Quiet voices dropped silently as quiet audio; buffer grows unbounded.
  - Fix decision: `fix-now`.
- **[P1] User Blindness / Missing Real-Time Audio Feedback (AP-054)**
  - Evidence: `src/components/salon/VoiceIndicator.tsx:32-48` (static CSS ping, no live VU level).
  - Impact: User has zero feedback whether mic or Zoom audio is physically reaching the web app.
  - Fix decision: `fix-now`.
- **[P2] Monologue Boundary severing (FluidAudio Left-Context Missing) (AP-013, AP-026)**
  - Evidence: `extractCurrentSegment()` discards all previous audio without retaining overlap context.
  - Impact: Severe recognition accuracy degradation at chunk boundaries during long speech.
  - Fix decision: `fix-now`.

---

## 4. Пошаговые TDD-задачи реализации (Bite-Sized Tasks)

### Task 1: Контракты VAD и Порт Адаптивного VAD (AssemblyAI Pattern)

**Files:**
- Create: `src/speech/vad/vad-types.ts`
- Create: `src/speech/vad/energy-vad.ts`
- Test: `tests/energy-vad.test.ts`

- [ ] **Step 1: Написать failing test для `EnergyVad`**
  Проверяем:
  1) Адаптацию к фоновому шуму (EMA).
  2) Срабатывание при превышении порога ($\text{noiseFloor} \times 2.5$).
  3) Зависание (hangover frames): удержание активного состояния при микропаузе.
  4) Заморозку адаптации шума во время речи.

- [ ] **Step 2: Запустить тест и убедиться в падении**
  Run: `npx vitest run tests/energy-vad.test.ts`
  Expected: FAIL (модули не найдены).

- [ ] **Step 3: Реализовать `vad-types.ts` и `energy-vad.ts`**
  Чистый TypeScript без зависимостей, $\le 120$ строк.

- [ ] **Step 4: Запустить тест и убедиться в прохождении**
  Run: `npx vitest run tests/energy-vad.test.ts`
  Expected: PASS (4/4 тестов).

- [ ] **Step 5: Commit Task 1**
  ```bash
  git add src/speech/vad/ tests/energy-vad.test.ts
  git commit -m "feat(speech): implement AssemblyAI adaptive EnergyVad port"
  ```

---

### Task 2: Расширение контракта SpeechEngine и типизация пайплайна

**Files:**
- Modify: `src/speech/speech-types.ts`

- [ ] **Step 1: Добавить типы статусов пайплайна и обратных вызовов**
  ```typescript
  export type SpeechPipelineStatus = 'idle' | 'hearing' | 'transcribing' | 'distilling' | 'error';
  // Добавить в SpeechEngineCallbacks:
  // onAudioLevel?: (level: number) => void;
  // onPipelineStatus?: (status: SpeechPipelineStatus) => void;
  ```

- [ ] **Step 2: Проверить компиляцию**
  Run: `npx tsc --noEmit`
  Expected: PASS.

- [ ] **Step 3: Commit Task 2**
  ```bash
  git add src/speech/speech-types.ts
  git commit -m "feat(speech): add SpeechPipelineStatus and audio level callbacks"
  ```

---

### Task 3: Рефакторинг `StreamRecorder` с Pre-Roll и Left-Context (FluidAudio Pattern)

**Files:**
- Modify: `src/speech/stream-recorder.ts`
- Test: `tests/stream-recorder.test.ts`

- [ ] **Step 1: Написать failing test на Pre-Roll буфер и Left Context**
  Тестируем:
  1) Сохранение 500 мс преролла при начале речи.
  2) Метод `extractSegmentWithContext(leftContextMs)` сохраняет нахлест для следующего чанка.
  3) Непрерывный расчет RMS и уведомление подписчиков `onAudioLevel`.

- [ ] **Step 2: Запустить тест и убедиться в падении**
  Run: `npx vitest run tests/stream-recorder.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Реализовать `StreamRecorder` с интеграцией `EnergyVad`**
  Удалить ручной захардкоженный VAD из `StreamRecorder`, подключить `EnergyVad`. 
  Убедиться, что файл укладывается в $\le 200$ строк (AP-019).

- [ ] **Step 4: Запустить тест и убедиться в прохождении**
  Run: `npx vitest run tests/stream-recorder.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit Task 3**
  ```bash
  git add src/speech/stream-recorder.ts tests/stream-recorder.test.ts
  git commit -m "feat(speech): integrate EnergyVad and sliding window left-context into StreamRecorder"
  ```

---

### Task 4: Умный динамический диспетчер в `WhisperSpeechAdapter`

**Files:**
- Modify: `src/speech/whisper-speech-adapter.ts`
- Test: `tests/whisper-speech-adapter.test.ts`

- [ ] **Step 1: Написать failing test на динамическую отправку**
  Тестируем:
  1) Отправка по паузе 850 мс (EOU) без ожидания 4.5 с.
  2) Срабатывание по потолку 7.0 с при непрерывном монологе с передачей левого контекста.
  3) Переходы статусов: `idle` $\to$ `hearing` $\to$ `transcribing` $\to$ `idle`.

- [ ] **Step 2: Запустить тест и убедиться в падении**
  Run: `npx vitest run tests/whisper-speech-adapter.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Реализовать диспетчер в `WhisperSpeechAdapter`**
  Заменить фиксированный таймер на реакцию на события VAD:
  - `onSpeechStart` $\to$ переход в `hearing`.
  - `onSpeechPause` (850 мс тишины) $\to$ финализация фразы, переход в `transcribing`, вызов ASR.
  - `onMaxCeiling` (7.0 с) $\to$ срезка чанка с сохранением 1.5 с левого контекста, вызов ASR.

- [ ] **Step 4: Запустить тест и убедиться в прохождении**
  Run: `npx vitest run tests/whisper-speech-adapter.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit Task 4**
  ```bash
  git add src/speech/whisper-speech-adapter.ts tests/whisper-speech-adapter.test.ts
  git commit -m "feat(speech): dynamic EOU pause dispatch and monologue ceiling in WhisperSpeechAdapter"
  ```

---

### Task 5: Живой VU-метр и статусы конвейера в `VoiceIndicator`

**Files:**
- Modify: `src/components/salon/VoiceIndicator.tsx`
- Modify: `src/hooks/useSalonSpeech.ts`
- Modify: `src/components/SalonExperience.tsx`
- Test: `tests/voice-indicator.test.tsx`

- [ ] **Step 1: Написать failing test для `VoiceIndicator`**
  Тестируем:
  1) Рендеринг кольца с динамическим масштабом/яркостью от `audioLevel`.
  2) Отображение статусов: `«слышу речь…»`, `«распознаю (GigaAM v3)…»`, `«микрофон включен, но звука нет»`.

- [ ] **Step 2: Запустить тест и убедиться в падении**
  Run: `npx vitest run tests/voice-indicator.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Реализовать живой VU-метр и статусы в `VoiceIndicator`**
  Внедрить деликатное свечение и динамическую трансформацию ободка кнопки микрофона от реального RMS (0.0…1.0).
  Подключить в `useSalonSpeech.ts` проброс `audioLevel` и `pipelineStatus`.

- [ ] **Step 4: Запустить тест и убедиться в прохождении**
  Run: `npx vitest run tests/voice-indicator.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit Task 5**
  ```bash
  git add src/components/salon/VoiceIndicator.tsx src/hooks/useSalonSpeech.ts src/components/SalonExperience.tsx tests/voice-indicator.test.tsx
  git commit -m "feat(ui): add live reactive VU meter and pipeline state badges to VoiceIndicator"
  ```

---

## 5. Dual-Circuit Verification Plan (S9 Gate)

После завершения всех задач запускается двухконтурный гейт S9:

1. **Контур 1: Architectural Reviewer (`arch-rules-implementation-review`)**
   - Запуск полного сьюта Vitest: `npx vitest run`.
   - Проверка типов: `npx tsc --noEmit`.
   - Проверка циклических зависимостей: `npx madge --circular src/`.
   - Проверка лимитов строк: каждый файл в `src/` $\le 250$ строк (AP-019).
   - Проверка инверсии зависимостей: VAD изолирован через порт (AP-010).
   - Вердикт: `VERDICT: PASS | FAIL`.

2. **Контур 2: Product Reviewer (`arch-improvement-product-review`)**
   - Проверка всех 4 сценариев из раздела 1:
     - Сценарий 1 (короткая фраза $\to$ 850 мс пауза $\to$ немедленный улет в GigaAM).
     - Сценарий 2 (монолог $\to$ срезка на 7 с без потери слов с левым контекстом).
     - Сценарий 3 (тихий голос из динамиков $\to$ адаптивный шум $\to$ отсутствие дропов).
     - Сценарий 4 (живой VU-метр $\to$ ободок дышит от голоса $\to$ прозрачные статусы).
   - Проверка сборки `npm run build` и статуса PM2.
   - Вердикт: `VERDICT: PASS | FAIL`.

---

## 6. Ledger Update & Memory (S10, S11)
- Зафиксировать результаты Cycle 19 в `docs/arch-improvement/review-log.md`.
- Зафиксировать архитектурный урок по адаптивному VAD и Sliding Window в `docs/arch-improvement/memory.md`.
- Записать факт в GBrain.
- Запушить коммиты в git-репозиторий.
