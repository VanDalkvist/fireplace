# Superpowers Plan: Robust Live Speech-to-Text & Conversational Distillation (Cycle 3)

Date: 2026-10-21
Project: `salon-presence`
Architecture Context Map: `docs/arch-improvement/review-log.md`

## Goal
Превратить голосовой ввод в надежный, живой и чуткий инструмент для сессии присутствия: обеспечить непрерывное слушание без разрывов (авто-keepalive, восстановление после пауз, 1400мс авто-финализация зависших interim-результатов), внедрить семантический дистиллятор живой разговорной речи (очистка паразитов «ну я чувствую», «мне кажется», выделение сути чувств и желаний из длинных фраз), добавить реал-тайм подсветку распознанных эмоций в `VoiceIndicator` со строгим соблюдением AP-правил (`arch-rules.md`, $\le 250$ строк/файл) и TDD-тестами.

## Findings in Scope (fix-now)
- `[P1]` Зависание и отключение `SpeechRecognition` при молчании в Chrome -> внедрение сторожевого таймера (watchdog), авто-перезапуска с debounce и тайм-аута авто-финализации (1400 мс) при задержке серверного `isFinal`.
- `[P1]` Захламление поляны длинными фразами при отсутствии точного словарного матча -> семантический дистиллятор разговорных конструкций (удаление стоп-слов «ну», «в общем», «мне сейчас», очистка знаков препинания, ограничение ядра до 1–3 слов).
- `[P2]` Отсутствие мгновенной обратной связи при распознавании -> реал-тайм парсинг и подсветка распознанного чувства в `VoiceIndicator` прямо во время произнесения (interim preview).

## Out of Scope (log-only / blocked)
- `[P3]` Локальная нейросеть Whisper/Moonshine в WebWorker (log-only: Web Speech API покрывает требования сессии без скачивания 60МБ WASM-весов).
- `[P3]` Мультиязычный перевод en-US (log-only: сессия 23 октября проходит на русском языке).

---

## Tasks & Fix Slices

### Slice 1: Domain Lexicon Distiller & Stop-word Normalizer (`src/domain/`)
- [ ] Task 1.1: Написать юнит-тесты `tests/lexicon-distiller.test.ts` (проверка очистки стоп-слов, выделения ядра из фраз вроде «ну у меня сейчас сильная усталость в теле», детекции паса и желаний).
- [ ] Task 1.2: Реализовать функции дистилляции в `src/domain/lexicon-engine.ts` (`distillSpokenPhrase`, `extractSemanticCore`, очистка стоп-слов, $\le 240$ строк).

### Slice 2: Speech Engine Resilience & Auto-Finalization (`src/speech/`)
- [ ] Task 2.1: Написать юнит-тесты `tests/speech-resilience.test.ts` (проверка авто-перезапуска при `onend`, обработки ошибок `no-speech` и `network`, 1400мс авто-финализации interim-буфера).
- [ ] Task 2.2: Обновить `src/speech/speech-engine.ts` (внедрить сторожевой таймер, дебаунс авто-перезапуска, авто-финализацию по паузе, $\le 200$ строк).

### Slice 3: Real-Time Visual Feedback & Experience Integration (`src/components/`)
- [ ] Task 3.1: Обновить `src/components/salon/VoiceIndicator.tsx` (реал-тайм индикация распознанного чувства `[ замедление ]` золотистым янтарем прямо в процессе говорения, $\le 110$ строк).
- [ ] Task 3.2: Обновить обработчик речи в `src/components/SalonExperience.tsx` (подключение дистиллятора речи, безопасный fallback для живых фраз, $\le 240$ строк).

### Slice 4: Verification & Dual Circuit Gate (S9)
- [ ] Task 4.1: Запуск полного сьюта Vitest (все тесты 100% зеленые).
- [ ] Task 4.2: Проверка типов `tsc --noEmit` (0 ошибок, 0 `any`).
- [ ] Task 4.3: Проверка лимитов строк `wc -l` (все файлы $\le 250$ строк, AP-019).
- [ ] Task 4.4: Проверка отсутствия циклических зависимостей (AP-025).
- [ ] Task 4.5: Скриншот-верификация экрана с активным индикатором речи через headless Chrome.
- [ ] Task 4.6: Оформление записи в `docs/arch-improvement/review-log.md` (Cycle 3) и сохранение в GBrain.

---
