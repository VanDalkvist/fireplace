# Architecture Improvement Plan - Cycle 5: Real Local AI, Honest Audio Contract & Resilient Circle Input

- **Cycle:** 5
- **Goal:** Ликвидировать все симуляции и ложные обещания: развернуть реальную локальную модель `qwen2.5:0.5b` в Ollama, обеспечить честную индикацию работы нейросети vs словарного фоллбека, вернуть элегантный резервный текстовый инпут для участников, устранить иллюзию захвата Zoom-потока в Web Speech и сделать прозрачное управление эстафетой круга.
- **Standards:** `arch-rules.md` (AP-010..AP-071), `arch-improvement-loop` (FSM S0..S12), `arch-rules-slice-planning`.
- **Target Line Count:** Каждый файл $\le 250$ строк (AP-019).
- **Target Quality:** 0 ошибок `tsc`, 0 циклов `madge`, 100% зеленые детерминированные тесты Vitest.

---

## Architecture Context Map Reference
- **Source docs:** `docs/arch-improvement/review-log.md`, `src/domain/phrase-distiller.ts`, `src/audio/audio-engine.ts`, `src/components/SalonExperience.tsx`.
- **Critical gates:** AP-010, AP-012, AP-018, AP-019, AP-025, AP-028, AP-029, AP-054, AP-064, AP-071.

---

## Planned Slices

### Slice 1: Реальная модель Ollama и честный статус нейродистилляции
- **Boundary:** Domain / Infrastructure Adapter (`src/domain/phrase-distiller.ts`, `src/domain/types.ts`)
- **AP Gates:** AP-012 (Fail-fast), AP-018 (No false success), AP-044 (Protected external call), AP-071 (Real runtime daemon)
- **Tasks:**
  1. Выполнить команду `ollama pull qwen2.5:0.5b` и верифицировать через `curl http://127.0.0.1:11434/api/tags`.
  2. Добавить проверку доступности модели `checkOllamaModelStatus(model: string)` и типизированный результат дистилляции `engineUsed: "qwen2.5:0.5b" | "lexicon-fallback"`.
  3. Написать тест в `tests/phrase-distiller.test.ts`, проверяющий фиксацию реального статуса движка (`engineUsed`).
  4. Сохранить строгий лимит $\le 250$ строк в `phrase-distiller.ts`.

### Slice 2: Резервный созерцательный текстовый инпут (Hearth Input)
- **Boundary:** Presentation / UI Overlay (`src/components/HearthInput.tsx`, `src/components/SalonExperience.tsx`)
- **AP Gates:** AP-018 (Single responsibility), AP-019 (<= 250 lines), AP-054 (Resilient UI states), AP-064 (S1 Design System)
- **Tasks:**
  1. Создать легковесный компонент `src/components/HearthInput.tsx` ($\le 100$ строк):
     - Открывается по нажатию `Enter` или клику на стул.
     - Созерцательный вид: полупрозрачная рамка `#ffb266`/20, шрифт JetBrains Mono, placeholder `«что ты чувствуешь сейчас?»`.
     - Отправка по `Enter` (прогоняется через `distillWithNeuralFallback`), закрытие по `Escape`.
  2. Написать тест `tests/hearth-input.test.ts` (проверка эвентов и передачи текста).
  3. Подключить в `SalonExperience.tsx` с соблюдением общего лимита $\le 250$ строк.

### Slice 3: Честный контракт аудио и устранение фейкового захвата Zoom
- **Boundary:** Audio / Speech Adapters (`src/audio/audio-engine.ts`, `src/speech/speech-engine.ts`)
- **AP Gates:** AP-018 (No false success), AP-071 (Truth in interfaces)
- **Tasks:**
  1. Убрать ложное утверждение о том, что `captureMeetingAudio()` транскрибирует речь участников встречи через `webkitSpeechRecognition`.
  2. В `SalonAudioEngine` переименовать или четко специфицировать метод как `captureMeetingRms()` — это измеритель громкости системного звука для визуализации костра, а не транскрибатор.
  3. В `SalonExperience.tsx` и HUD честно выводить статус микрофона: `микрофон ведущего (Web Speech)` и статус модели: `нейросеть: qwen2.5:0.5b` (зеленая/янтарная точка).

### Slice 4: Честное и осознанное управление эстафетой круга (Circle Baton)
- **Boundary:** Presentation / Session Domain (`src/components/SalonExperience.tsx`, `src/domain/session-fsm.ts`)
- **AP Gates:** AP-018, AP-054
- **Tasks:**
  1. Устранить слепой авто-инкремент `((seat % 12) + 1)`, произвольно раскидывающий реплики.
  2. Сделать фокус говорящего устойчивым: фраза привязывается к выбранному стулу.
  3. Добавить в интерфейс / хоткеи явную команду передачи эстафеты следующему (`Tab` или стрелка `→`), а также клик по номеру стула на поляне.

### Slice 5: Двухконтурная верификация S9 (Dual-Circuit Gate)
- **Verification:**
  1. `bun run test` (все тесты зеленые, детерминизм).
  2. `bun run typecheck` (0 ошибок, 0 any).
  3. `wc -l` по всем файлам `src/` (все $\le 250$ строк).
  4. `npx madge --circular src/` (0 циклов).
  5. Реальный запрос к Ollama: реальное время инференса `qwen2.5:0.5b`.
  6. Запуск независимых Reviewer subagents (Arch + Product) на реальном стенде.
  7. Фиксация в `docs/arch-improvement/review-log.md` и коммит/пуш в git.
