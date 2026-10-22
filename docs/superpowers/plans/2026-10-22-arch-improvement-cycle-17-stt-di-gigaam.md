# Arch Improvement Cycle 17: OpenAI Standard Audio API, Dependency Injection & GigaAM Service

Date: 2026-10-22
Author: Lead Agent & Vanya
Status: Approved

## Context & Objectives
- Architecture Context Map: MVP/Prod, AP-010 (Ports & Adapters), AP-011 (Low Coupling), AP-012 (Fail-Fast), AP-019 (Lines <= 250), AP-020 (Composition Root), AP-021 (Thin Entry Points), AP-022 (Typed Errors), AP-025 (Import Discipline), AP-026 (API Contracts), AP-029 (TypeScript Strictness).
- Goal:
  1. Реализовать стандарт работы OpenAI Audio API (`POST /v1/audio/transcriptions`) для взаимной совместимости всех локальных ASR серверов.
  2. Реализовать полноценный Dependency Injection (DI) для STT-движков (`SpeechToTextPort`, `SpeechServiceRegistry`, фабрика).
  3. Обновить Whisper в PM2 с `ggml-small.bin` до `ggml-large-v3-turbo.bin` (WER ~8% на русском языке, высокая скорость и точность).
  4. Развернуть отдельный PM2 сервис для Sber GigaAM v3 на базе нативного Rust-сервера `gigastt` (INT8 модель 225 МБ, память ~350 МБ RAM, порт 9876).
  5. Обеспечить бесшовное переключение движков в `salon-presence` без перезагрузки и поломки диаризации спикеров (CAM++ на порту 8086).

---

## Findings Selected for Fix-Now

- [P1] Hardcoded ASR adapter coupling & missing DI registry
  - Evidence: `src/speech/whisper-speech-adapter.ts` жестко связан с Whisper URL и не позволяет подставлять другие движки без правки кода.
  - Impact: Невозможно протестировать GigaAM или другие ASR без нарушения принципа OCP (Open-Closed).
  - Rule: AP-010, AP-020
  - Fix decision: fix-now

- [P1] Non-standard ASR API contract
  - Evidence: `src/speech/whisper-client.ts` использует кастомный Whisper эндпоинт `/inference` вместо стандартного индустриального контракта `POST /v1/audio/transcriptions`.
  - Impact: Невозможно переиспользовать открытые шлюзы (Speaches, gigastt, LocalAI), так как они ожидают стандартный OpenAI Audio API.
  - Rule: AP-026
  - Fix decision: fix-now

- [P2] Whisper model in PM2 is low-accuracy small
  - Evidence: `whisper-asr` в PM2 запущен с моделью `ggml-small.bin` (WER 18–28%).
  - Impact: Частые искажения окончаний и слов в речи участников круга.
  - Rule: AP-027, User Goal
  - Fix decision: fix-now

- [P2] GigaAM v3 service missing from PM2
  - Evidence: Отсутствует демон `gigaam-asr`.
  - Impact: Недоступен SOTA движок русского языка с WER 6.9%.
  - Rule: AP-027, User Goal
  - Fix decision: fix-now

---

## Implementation Slices

### Slice 1: Standard OpenAI Audio API Client (`OpenAiSpeechClient`)
- **Boundary**: Infrastructure / Speech Client (`src/speech/openai-speech-client.ts`).
- **AP Gates**: AP-012, AP-019, AP-022, AP-026, AP-029.
- **Red Test First**: `tests/openai-speech-client.test.ts`:
  - Проверка отправки `multipart/form-data` на `${baseUrl}/v1/audio/transcriptions` с полями `file`, `model`, `language: 'ru'`, `response_format: 'json'`.
  - Проверка корректного парсинга ответа `{"text": "привет"}`.
  - Проверка fallback на `${baseUrl}/inference` если сервер старый whisper.cpp (AP-012 fail-fast with graceful fallback).
- **Implementation**:
  - Создать `src/speech/openai-speech-client.ts` (<= 150 строк).
- **Verification**: `npx vitest run tests/openai-speech-client.test.ts`.

### Slice 2: Pluggable `SpeechToTextPort` & `SpeechServiceRegistry` (DI)
- **Boundary**: Domain / Application (`src/speech/speech-types.ts`, `src/speech/speech-registry.ts`).
- **AP Gates**: AP-010, AP-011, AP-019, AP-020, AP-029.
- **Red Test First**: `tests/speech-registry.test.ts`:
  - Регистрация нескольких провайдеров (`gigaam`, `whisper-turbo`, `browser`).
  - Переключение активного провайдера `setActive(id)`.
  - Получение активного провайдера и валидация контракта `transcribe(audioBlob)`.
- **Implementation**:
  - Обновить `src/speech/speech-types.ts`: объявить интерфейс `SpeechToTextPort`.
  - Создать `src/speech/openai-speech-adapter.ts` (реализует `SpeechToTextPort` через `OpenAiSpeechClient`).
  - Создать `src/speech/speech-registry.ts` (DI-контейнер для ASR бэкендов).
- **Verification**: `npx vitest run tests/speech-registry.test.ts`.

### Slice 3: Unified Engine & Composition Root
- **Boundary**: Application / UI Composition Root (`src/speech/speech-engine.ts`, `src/speech/speech-factory.ts`, `src/ui/salon-controls.tsx`).
- **AP Gates**: AP-010, AP-019, AP-020, AP-025.
- **Red Test First**: `tests/speech-engine.test.ts` & `tests/speech-factory.test.ts`:
  - Проверка инициализации движка с инжектированным `SpeechToTextPort`.
  - Проверка параллельного вызова STT и CAM++ Speaker Identification: `Promise.all([stt.transcribe(blob), speaker.identify(blob)])`.
  - Проверка корректной эмиссии `onFinalPhrase(text, seatNumber)`.
- **Implementation**:
  - Рефакторинг `src/speech/speech-engine.ts` под DI (<= 220 строк).
  - Обновление `src/speech/speech-factory.ts` (Composition Root, регистрация дефолтных GigaAM и Whisper Turbo).
  - Добавление переключателя ASR Engine в `SalonControls` (GigaAM / Whisper / Browser).
- **Verification**: `npx vitest run tests/speech-engine.test.ts`.

### Slice 4: Whisper Large Turbo in PM2
- **Boundary**: Infrastructure / PM2.
- **Steps**:
  1. Скачать `ggml-large-v3-turbo.bin` (1.6 ГБ) в `/Users/vanya/Projects/.models/whisper/`.
  2. Перезапустить сервис `whisper-asr` в PM2 с аргументами:
     `-m /Users/vanya/Projects/.models/whisper/ggml-large-v3-turbo.bin --port 8085 --host 127.0.0.1 -l ru --convert --tmp-dir /tmp`.
  3. Проверить статус через `curl http://127.0.0.1:8085`.

### Slice 5: Standalone GigaAM v3 Service (`gigastt`) in PM2
- **Boundary**: External Infrastructure / PM2.
- **Steps**:
  1. Скачать нативный Apple Silicon бинарник `gigastt` v2.22.0.
  2. Установить в `~/Projects/.bin/gigastt` (с правами исполнения `chmod +x`).
  3. Выполнить `gigastt download` (загрузка INT8 модели ~225 МБ).
  4. Запустить сервис `gigaam-asr` в PM2:
     `pm2 start "/Users/vanya/Projects/.bin/gigastt serve --port 9876" --name gigaam-asr`.
  5. Проверить доступность через `curl http://127.0.0.1:9876/ready` и `curl http://127.0.0.1:9876/v1/audio/transcriptions`.

---

## Dual-Circuit Verification (S9 Gate)

1. **Architectural Reviewer (`arch-rules-implementation-review`)**:
   - `npx vitest run` — все тесты (81+) GREEN.
   - `npx tsc --noEmit` — 0 ошибок типизации (AP-029).
   - Все файлы $\le 250$ строк (AP-019).
   - `npx madge --circular src/` — 0 циклических зависимостей (AP-025).
   - Строгая изоляция домена от инфраструктуры (AP-010, AP-020).

2. **Product Reviewer (`arch-improvement-product-review`)**:
   - `curl` проверка PM2 сервисов: `whisper-asr` (8085), `gigaam-asr` (9876), `sherpa-speaker` (8086), `salon-presence` (4343).
   - Тестовая отправка аудиофайла в оба сервиса через OpenAI API: получение распознанного русского текста.
   - Проверка работы UI и настроек выбора движка.

---

## Ledger & Memory (S10, S11)
- Зафиксировать результаты Cycle 17 в `docs/arch-improvement/review-log.md`.
- Записать уроки в `docs/arch-improvement/memory.md`.
