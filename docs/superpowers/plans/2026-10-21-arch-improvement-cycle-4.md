# Superpowers Plan: Unified Autonomous Voice Pipeline & Neural Distillation (Cycle 4)

Date: 2026-10-21
Project: `salon-presence`
Architecture Context Map: `docs/arch-improvement/review-log.md`

## Goal
Создать единую бесшовную сессию Салона присутствия без Zoom SDK: внедрить двухуровневый нейродистиллятор длинных фраз (`src/domain/phrase-distiller.ts` с поддержкой локального Ollama / Pi Classifier и безопасным 800мс фоллбеком на словарный экстрактор), добавить захват звука встречи Zoom/Telegram через Web Audio `getDisplayMedia` в `SalonAudioEngine`, и автоматическую передачу эстафеты круга при завершении фразы с соблюдением всех AP-правил ($\le 250$ строк/файл) и TDD.

## Findings in Scope (fix-now)
- `[P1]` Захламление поляны длинными монологами при отсутствии смысловой суммаризации -> двухуровневый нейродистиллятор `src/domain/phrase-distiller.ts`: Tier 1 (мгновенный словарный парсинг) + Tier 2 (микро-LLM сжатие до 1–3 глубоких слов с тайм-аутом 800 мс).
- `[P1]` Отсутствие нативного захвата звука звонка Zoom без Zoom SDK -> внедрение `captureMeetingAudio()` в `src/audio/audio-engine.ts` (через `getDisplayMedia` со системным звуком, по проверенному рецепту «03 · луна»).
- `[P2]` Привязка всех реплик к одному стулу при отсутствии ручных кликов -> автоматическая передача эстафеты круга (`(seat + 1) % 12`) при финализации реплики в `SalonExperience.tsx`.

## Out of Scope (log-only / blocked)
- `[P3]` Скачивание 75МБ весов Whisper WASM в браузер (log-only: локальный Ollama и Web Speech API закрывают задачу без забивания трафика).

---

## Tasks & Fix Slices

### Slice 1: Neural Phrase Distiller with Tiered Fallback (`src/domain/`)
- [ ] Task 1.1: Написать юнит-тесты `tests/phrase-distiller.test.ts` (проверка Tier 1 для коротких/словарных фраз, Tier 2 для длинных монологов с моком Ollama/Classifier, проверка 800мс тайм-аута и graceful degradation при отказе сети).
- [ ] Task 1.2: Реализовать `src/domain/phrase-distiller.ts` ($\le 120$ строк, AP-010, AP-018, AP-029).

### Slice 2: Meeting Audio Capture & VAD Energy Meter (`src/audio/`)
- [ ] Task 2.1: Написать юнит-тесты `tests/meeting-audio.test.ts` (проверка захвата аудио-потока `getDisplayMedia`, отделения аудио от видео, вычисления RMS уровня речи).
- [ ] Task 2.2: Реализовать методы захвата звука встречи и VAD в `src/audio/audio-engine.ts` ($\le 230$ строк).

### Slice 3: Unified Experience & Speaker Baton Pass (`src/components/`)
- [ ] Task 3.1: Подключить `phrase-distiller` и захват звука встречи в `src/components/SalonExperience.tsx` ($\le 249$ строк).
- [ ] Task 3.2: Реализовать авто-переход эстафеты круга к следующему стулу `((seat % 12) + 1)` после вылета слова в очаг.

### Slice 4: Verification & Dual Circuit Gate (S9)
- [ ] Task 4.1: Запуск полного сьюта Vitest (все тесты 100% зеленые).
- [ ] Task 4.2: Проверка строгой типизации `tsc --noEmit` (0 ошибок, 0 `any`).
- [ ] Task 4.3: Проверка лимитов строк `wc -l` (все файлы $\le 250$ строк, AP-019).
- [ ] Task 4.4: Проверка отсутствия циклических зависимостей (AP-025, `madge`).
- [ ] Task 4.5: Скриншот-верификация в headless Chrome.
- [ ] Task 4.6: Оформление записи в `docs/arch-improvement/review-log.md` (Cycle 4), фиксация коммита, push и сохранение в GBrain.

---
