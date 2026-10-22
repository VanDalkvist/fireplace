# Arch Improvement Memory

## 2026-10-22 - OpenAI Audio API Standard & Multi-ASR DI
- Context: Переход на мультивендорный ASR (GigaAM v3 + Whisper Large Turbo) и стандартизацию протоколов.
- Symptom: Разные ASR-серверы исторически имели разные кастомные эндпоинты (`/inference` у whisper.cpp, `/v1/transcribe` у некоторых Rust/Python шлюзов), что провоцировало спагетти-код в адаптерах.
- Cause: Отсутствие единого DTO/API контракта (AP-026) на уровне клиента.
- Use next time: Всегда использовать спецификацию OpenAI Audio API (`POST /v1/audio/transcriptions` с multipart/form-data) как базовый контракт. Любой новый ASR подключается как `SpeechToTextPort` через универсальный `OpenAiSpeechAdapter`.
- Evidence: `tests/openai-speech-client.test.ts`, `tests/speech-registry.test.ts`, 93/93 тестов GREEN.

## 2026-10-22 - Lean Rust ASR vs Python Footprint
- Context: Развертывание локального Sber GigaAM v3 на Mac M4 16GB.
- Symptom: PyTorch/Python стек отъедает от 1.5 до 2.5 ГБ RAM, что вплотную приближает систему к лимиту памяти при параллельной работе IDE, Chrome и Whisper.
- Cause: Большие оверхеды рантайма Python и CUDA/MPS runtime.
- Use next time: Использовать нативные Rust-бинарники (`gigastt`) с ONNX Runtime и CoreML для Apple Silicon. Вес модели INT8 — 225 МБ, потребление RAM — всего 350 МБ, старт за 2 секунды.
- Evidence: PM2 сервис `gigaam-asr` на порту 9876, `curl http://127.0.0.1:9876/v1/models`.

## 2026-10-22 - Client VAD Pitfall & Ambient Room Capture
- Context: Захват звука видеоконференции (Zoom/Meet) и голосов из внешних динамиков в веб-приложении.
- Symptom: Речь участников Zoom полностью игнорировалась браузером, ни один сегмент не отправлялся в ASR.
- Cause: 1) Дефолтный `getUserMedia` включает Chrome AEC (эхоподавление), который агрессивно вырезает звук из динамиков; 2) `AudioContext` стартовал `suspended`, обнуляя RMS; 3) Клиентский VAD-гейт молча отбрасывал сегменты без логирования.
- Use next time: Для амбиентного захвата комнаты отключать `echoCancellation` и `noiseSuppression`; непрерывно трекать пиковый RMS с порогом `0.005`; вызывать `audioContext.resume()`; обязательно писать диагностический лог о каждом обработанном/пропущенном сегменте.
- Evidence: `src/speech/stream-recorder.ts`, `src/speech/whisper-speech-adapter.ts`, 93/93 тестов GREEN.

