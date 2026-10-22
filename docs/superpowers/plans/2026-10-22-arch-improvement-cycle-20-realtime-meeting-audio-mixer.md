# Implementation Plan - Cycle 20: Real-Time Dual-Stream Audio Mixer & Long-Meeting Stability

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable seamless, continuous real-time meeting transcription in Salon Presence by mixing the user's independent microphone with the remote Zoom audio stream (from headphones) via Web Audio API, while bounding memory for long (1-2+ hour) calls.

**Architecture:** Clean Ports & Adapters (AP-010, AP-020). Introduce `AudioStreamMixer` that blends physical mic input with system display audio into a unified `MediaStreamDestination`. Enforce bounded $O(1)$ pre-roll buffering in `StreamRecorder` during prolonged silence.

**Tech Stack:** Web Audio API (`AudioContext`, `MediaStreamAudioDestinationNode`, `createMediaStreamSource`, `GainNode`), TypeScript (strict, 0 any), Vitest.

---

## 1. Product Scenarios (Acceptance User Journeys)

### Сценарий 1: «Живой созвон в Zoom в наушниках с отдельным микрофоном» (Dual-Stream Mixer)
* **Given:** Пользователь созванивается в Zoom. Голоса собеседников звучат в наушниках, перед пользователем стоит его отдельный микрофон.
* **When:** Пользователь нажимает кнопку `встреча (zoom)` и выбирает экран с включенной опцией передачи аудио.
* **Then:**
  1. Салон НЕ отключает личный микрофон пользователя.
  2. Салон берет поток микрофона и поток встречи из наушников и смешивает их через `AudioStreamMixer` в один виртуальный кабель.
  3. Индикатор микрофона переходит в статус `«слушаю встречу: микрофон + zoom»`.
  4. Когда говорит пользователь — его фраза распознается Sber GigaAM v3 и садится на его стул.
  5. Когда говорит собеседник из Zoom — его фраза распознается и садится на стул собеседника (через диаризацию CAM++).
  6. Слова обоих участников плавно летят к костру в реальном времени.

### Сценарий 2: «Долгая встреча (1–2 часа) без утечек памяти и зависаний» (Bounded Silence Pre-roll)
* **Given:** Созвон длится 90 минут. Периодически в разговоре возникают длинные паузы (участники читают документ или молчат 2 минуты).
* **When:** После 2 минут тишины кто-то начинает говорить.
* **Then:**
  1. В период тишины буфер `StreamRecorder` строго удерживает только последние 500 мс (2–3 чанка), отбрасывая старую тишину.
  2. Память вкладки браузера не раздувается и остается стабильной ($\le 50$ МБ).
  3. Первая фраза после тишины отправляется мгновенно (файл размером в несколько килобайт, а не 2 минуты тишины), распознается за 0.25 секунды.

### Сценарий 3: «Пользователь забыл поставить галочку аудио при шаринге» (Graceful Guidance)
* **Given:** Пользователь нажал `встреча (zoom)`, но в окне Chrome забыл включить чекбокс «Поделиться аудио системы» или закрыл окно.
* **When:** Системный поток не вернул аудио-треков (`audioTracks.length === 0`).
* **Then:**
  1. Приложение не падает и не зависает в тишине.
  2. Личный микрофон пользователя остается активным (не глушится).
  3. В интерфейсе появляется понятное объяснение: *«Звук экрана не обнаружен. Выберите "Весь экран" и включите галочку "Предоставить доступ к аудио"»*.

---

## 2. File Decomposition & Line Budget (AP-019)

| File | Purpose | Line Budget |
|---|---|---|
| `src/audio/audio-mixer.ts` | NEW: `AudioStreamMixer` for blending mic + meeting streams | $\le 90$ lines |
| `src/audio/audio-engine.ts` | Update: expose mixer and combined stream methods | $\le 225$ lines |
| `src/speech/stream-recorder.ts` | Fix: clamp silence ring buffer to 500ms (2 chunks) when `!this.wasSpeaking` | $\le 248$ lines |
| `src/hooks/useSalonSpeech.ts` | Update: combine streams instead of killing mic on meeting toggle | $\le 220$ lines |
| `src/components/salon/VoiceIndicator.tsx` | Update: display dual-stream meeting status | $\le 135$ lines |
| `tests/audio-mixer.test.ts` | NEW: tests for Web Audio stream mixing | $\le 80$ lines |

All files stay strictly $\le 250$ lines (AP-019).

---

## 3. Tasks

### Task 1: Создание `AudioStreamMixer` (Web Audio API Stream Blending)

**Files:**
- Create: `src/audio/audio-mixer.ts`
- Test: `tests/audio-mixer.test.ts`

- [ ] **Step 1: Написать failing test для `AudioStreamMixer`**
  Тестируем:
  1) Смешивание двух `MediaStream` в один объединенный `MediaStream`.
  2) Корректное подключение GainNode для каждого источника.
  3) Метод `cleanup()` отключает все узлы и закрывает контекст.

- [ ] **Step 2: Запустить тест и проверить падение**
  Run: `npx vitest run tests/audio-mixer.test.ts`
  Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `AudioStreamMixer`**
  Чистый класс без лишних зависимостей, $\le 90$ строк.

- [ ] **Step 4: Запустить тест и проверить прохождение**
  Run: `npx vitest run tests/audio-mixer.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit Task 1**
  ```bash
  git add src/audio/audio-mixer.ts tests/audio-mixer.test.ts
  git commit -m "feat(audio): Task 1 - Implement AudioStreamMixer for blending mic and meeting audio"
  ```

---

### Task 2: Фиксация $O(1)$ преролл-буфера в `StreamRecorder` во время тишины

**Files:**
- Modify: `src/speech/stream-recorder.ts`
- Test: `tests/stream-recorder.test.ts`

- [ ] **Step 1: Написать failing test на ограничение буфера в тишине**
  Проверяем: если VAD фиксирует тишину (`!this.wasSpeaking`), размер `ringBuffer` не превышает 2 чанков (500 мс), независимо от того, сколько чанков поступило (хоть 100).

- [ ] **Step 2: Запустить тест и проверить падение**
  Run: `npx vitest run tests/stream-recorder.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Внедрить ограничение буфера в тишине в `StreamRecorder`**
  ```typescript
  if (!this.wasSpeaking && this.ringBuffer.length > 2) {
    this.ringBuffer.shift(); // retain strictly ~500ms pre-roll during silence
  }
  ```

- [ ] **Step 4: Запустить тест и проверить прохождение**
  Run: `npx vitest run tests/stream-recorder.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit Task 2**
  ```bash
  git add src/speech/stream-recorder.ts tests/stream-recorder.test.ts
  git commit -m "fix(speech): Task 2 - Restrict silence buffer to 500ms pre-roll to prevent memory growth"
  ```

---

### Task 3: Интеграция микшера в `useSalonSpeech` и `SalonExperience`

**Files:**
- Modify: `src/audio/audio-engine.ts`
- Modify: `src/hooks/useSalonSpeech.ts`
- Modify: `src/components/salon/VoiceIndicator.tsx`
- Test: `tests/meeting-audio.test.ts`

- [ ] **Step 1: Написать failing test на сохранение микрофона при подключении встречи**
  Тестируем: при вызове `handleToggleMeetingAudio` создается объединенный смешанный поток (микрофон + встреча), микрофон не глушится.

- [ ] **Step 2: Запустить тест и проверить падение**
  Run: `npx vitest run tests/meeting-audio.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Реализовать микширование потоков в `useSalonSpeech`**
  1. Получаем `meetingStream`.
  2. Получаем текущий `micStream`.
  3. Смешиваем через `AudioStreamMixer`.
  4. Передаем `mixedStream` в движок речи.
  5. Если `meetingStream` завершается (юзер остановил шаринг), бесшовно возвращаемся на чистый `micStream`.

- [ ] **Step 4: Запустить все тесты**
  Run: `npx vitest run`
  Expected: ALL PASS.

- [ ] **Step 5: Commit Task 3**
  ```bash
  git add src/audio/audio-engine.ts src/hooks/useSalonSpeech.ts src/components/salon/VoiceIndicator.tsx tests/meeting-audio.test.ts
  git commit -m "feat(audio): Task 3 - Seamless dual-stream mixing in useSalonSpeech and VoiceIndicator"
  ```

---

## 4. Dual-Circuit Verification (S9 Gate)
1. **Architectural Review:**
   - Полный сьют тестов GREEN (`npx vitest run`).
   - `tsc --noEmit` — 0 ошибок.
   - `madge --circular src/` — 0 циклов.
   - Все файлы $\le 250$ строк (AP-019).
2. **Product Review:**
   - Сценарии 1, 2, 3 проверены.
   - Проверка сборки `npm run build` и PM2 процессов.

---

## 5. Ledger & Memory Update (S10, S11)
- Запись Cycle 20 в `review-log.md` и `memory.md`.
- Запись факта в GBrain.
- Git push.
