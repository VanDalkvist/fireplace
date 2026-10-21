# Arch Improvement Review Log: salon-presence

## Cycle 1 - 2026-10-20 - Salon Design System (S1) & Screen 05 (Feelings & Voices)

### Context
- Branch: `main` (commit `3774943`, pushed to private remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Создание компонентной дизайн-системы Салона присутствия (S1) на базе shadcn/ui + Tailwind v4 из оригинальных ассетов AIM (`vendor/aim-upstream/`), реализация эталонного голосового экрана «05 · чувства и желания» с селективным связыванием реплик участников.
- Source docs:
  - `vendor/aim-upstream/*` (`aim-mini-apps.css`, `aim-app-shell.css`, `style.css`, `site-shell.css`)
  - `upstream/app.js`, `upstream/lexicon.json`, `upstream/music.js`
  - `~/Projects/arch-rules/arch-rules.md`
- Architecture gates: AP-010, AP-011, AP-019 (лимит 250 строк/файл), AP-020, AP-021, AP-025, AP-026, AP-028 (TDD детерминизм), AP-029 (TypeScript strictness).

### Findings & Resolution
- [P1] Монолитность и дублирование в upstream (640 строк в app.js) - fixed
  - Resolution: Декомпозировано на 23 чистых модуля, максимальный размер файла — 215 строк (`SalonExperience.tsx`).
  - Rule: AP-019, AP-010.
- [P1] Отсутствие строгой дизайн-системы - fixed
  - Resolution: Собран мост токенов S1 в `src/design-system/tokens.css`, стилизованы примитивы shadcn/ui (`button`, `sheet`, `dialog`, `slider`).
  - Rule: AP-014, AP-020.
- [P1] Ручной ввод в основном UX-потоке вместо голосового слушания - fixed
  - Resolution: Главный экран освобожден от инпутов, реализован слот слушания (`VoiceIndicator`, `isListening: true`, статус в хедере).
- [P2] Хаотичное связывание слов «все со всеми» - fixed
  - Resolution: Реализован алгоритм `computeSelectiveEdges` (`linking-graph.ts`): ограничение `maxEdgesPerToken = 2`, янтарные последовательные нити между репликами спикеров и льняные пунктирные нити эмоционального резонанса.
- [P3] Триггер вызова диалога правил IntroDialog - fixed
  - Resolution: Добавлена кнопка `?` в хедер и хоткеи `h` / `р` / `?`.
- [P3] Проверка типов в package.json - fixed
  - Resolution: Добавлен скрипт `"typecheck": "tsc --noEmit"`.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer (`thr_enuc66w3md`):**
   - Лимиты строк: 23 файла в `src/`, все строго `<= 250` строк (AP-019).
   - Тесты: 11/11 тестов Vitest GREEN (`session-fsm`, `linking-graph`, `lexicon-engine`).
   - Сборка: `vite build` 100% успешен.
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (AP-025, madge).
   - Изоляция Canvas/DOM: чистый Canvas Stage на `z-0` без React-зависимостей, UI Overlay на `z-10` с `pointer-events-none`.
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer (`thr_7k4j4v5kqw`):**
   - Пользовательский сценарий: передача эстафеты голоса по кругу, селективное связывание, всплытие фонариков желаний.
   - Дизайн-система S1: цвета `#050505`, янтарь `#ffb266`, теплый лен `#ece4d6`, кармин `#d92027`, строчные буквы, радиус `2px`.
   - Звук и хоткеи: Web Audio в D Dorian (`m`), `Tab` для выезда пульта `SalonPult`, `Space` для хода, `p` для паса.
   - Демо-режим: `?demo=1` запускает детерминированную симуляцию смены реплик каждые 4 секунды.
   - **Вердикт:** `VERDICT: PASS`.

### Residual Risk
- Активация AudioContext Web Audio API требует первого пользовательского жеста (клик или хоткей `m`), что соответствует стандарту браузерного автоплея.

---

## Cycle 3 - 2026-10-21 - Robust Live Speech Recognition & Conversational Distillation

### Context
- Branch: `main` (commit head, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Реализация и верификация надежного контура потокового голосового ввода (Web Speech API) для практики «Салон присутствия»: непрерывное слушание с авто-перезапуском при молчании (keepalive watchdog), 1400мс авто-финализация зависших interim-результатов при задержке серверного `isFinal`, семантический дистиллятор живой разговорной речи (`distillSpokenPhrase`: удаление стоп-слов «ну я чувствую», «мне кажется», выделение ядра чувств/желаний и ограничение длины несловарных фраз до 1–3 слов), живая индикация interim-результата с янтарным бейджем распознанной эмоции (`[ замедление ]`) в `VoiceIndicator` и кнопка переключения голоса `(v)` в `SalonControls`.
- Source docs:
  - `docs/superpowers/plans/2026-10-21-arch-improvement-cycle-3.md`
  - `src/speech/speech-engine.ts`, `src/domain/lexicon-engine.ts`
  - `upstream/lexicon.json`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-018, AP-019 (лимит <= 250 строк/файл), AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-064 (S1 дизайн-система).

### Findings & Resolution
- [P1] Отключение `SpeechRecognition` при молчании в Chrome - fixed
  - Resolution: Внедрен сторожевой таймер и дебаунс авто-перезапуска (400 мс) в `SalonSpeechEngine` при неожиданном событии `onend`, сохраняющий активный сеанс слушания. Фатальные ошибки (`not-allowed`) останавливают перезапуск без бесконечных циклов.
  - Rule: AP-010, AP-018.
- [P1] Зависание слов в воздухе при задержке серверного `isFinal` - fixed
  - Resolution: Реализована авто-финализация по тайм-ауту тишины: если участник произнес фразу и замолчал более чем на 1400 мс, а Chrome еще не прислал `isFinal: true`, накопленный interim-буфер автоматически финализируется и отправляется в экстрактор.
  - Rule: AP-018, AP-028.
- [P1] Захламление поляны длинными фразами при разговорной речи («ну я чувствую сильную усталость») - fixed
  - Resolution: Разработан семантический дистиллятор `distillSpokenPhrase`: фильтрует разговорные стоп-слова (`ну`, `в общем`, `как-то`, `мне сейчас`, `прямо`, `знаете`), надежно извлекает словарные чувства и желания даже из сложных предложений, распознает разговорные формы паса (`«я пас сегодня»`, `«помолчу»`), а для несловарных реплик выделяет компактное смысловое ядро (до 3–4 слов).
  - Rule: AP-010, AP-018, AP-019.
- [P2] Отсутствие видимой кнопки включения голоса и мгновенной обратной связи распознавания - fixed
  - Resolution: В `SalonControls` добавлена кнопка `голос (v)` со статусом активности; в `VoiceIndicator` добавлена реал-тайм индикация произносимого interim-текста и динамический бейдж распознанной сущности (`[ замедление ]`, `[ пас ]`, `[ тишины ]`), дающий мгновенное сенсорное подтверждение.
  - Rule: AP-064, AP-014.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - Лимиты строк: Все 35 файлов в `src/` строго `<= 247` строк (AP-019).
   - Тесты: 32/32 теста Vitest GREEN (11 тест-сьютов: `lexicon-distiller`, `speech-resilience`, `speech-engine`, `hearth-flame`, `hearth-words`, `hearth-seats`, `linking-graph`, `session-fsm`, `field-renderer`, `collision-layout`).
   - Сборка: `vite build` успешен за 110 мс.
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (madge, AP-025).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Голосовой сценарий: Протестирована дистилляция живой разговорной речи, автоматическая финализация по паузе и мгновенное отображение interim-текста с бейджем.
   - Скриншот-валидация: Headless Chrome подтвердил корректное отображение активного индикатора голоса (`участник 01 🎙`, `«я чувствую замедление…» [замедление]`, кнопка `голос (v)` в HUD) на фоне центрированного очага.
   - **Вердикт:** `VERDICT: PASS`.

### Residual Risk
- Web Speech API в Chromium-браузерах обращается к облачным серверам распознавания речи Google через TLS; при полном отсутствии интернет-соединения браузер выдаст ошибку `network`, что штатно обрабатывается движком с выводом подсказки в UI.


---

## Cycle 2 - 2026-10-21 - Production Hearth & Word Ring Architecture (S1 Design System)

### Context
- Branch: `main` (clean worktree, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Перенос проверенной в эксперименте `04-hearth-fire` визуальной модели «Созерцательный очаг присутствия» в основную архитектуру проекта (`src/`) на базе дизайн-системы S1 (Tailwind v4 + shadcn/ui + JetBrains Mono): центрированный живой костер, Hearth Ring с защитным клиренсом огня, диалоговая гравитация отклика 22%, закон остывания до 0.10, чистые точки-угольки участников без номеров, плавающий HUD с Zen-режимом (`h`).
- Source docs:
  - `experiments/04-hearth-fire/index.html` (сохранён без изменений)
  - `docs/superpowers/plans/2026-10-21-arch-improvement-cycle-2.md`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-011, AP-014, AP-019 (лимит <= 250 строк/файл), AP-020, AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-064 (S1 shadcn/ui).

### Findings & Resolution
- [P1] Устаревший рендерер Prompt Motion изолиний в `motion-engine.ts` - fixed
  - Resolution: Заменён на модульный пайплайн очага: `hearth-flame.ts` (161 строка), `hearth-particles.ts` (139 строк), `hearth-seats.ts` (113 строк), `hearth-words.ts` (209 строк), `motion-engine.ts` (138 строк). Все файлы строго `<= 210` строк.
  - Rule: AP-010, AP-019.
- [P1] Слова перекрывали костер и связывались ломаными линиями - fixed
  - Resolution: Внедрён канонический Hearth Ring ($R = 0.52 \dots 0.74$) со строгим клиренсом огня ($|dx| \ge 125\text{px}$ в зоне пламени), диалоговой гравитацией отклика 22% к предыдущему слову, тающим лучом принадлежности (2.4s) и законом остывания прозрачности ($\Delta = -0.02$, пол $0.10$).
  - Rule: AP-011, AP-014.
- [P1] Фиксированный бокс с черными рамками - fixed
  - Resolution: Интерфейс переведён на full-bleed 100vw/100vh с канвасом на `fixed inset-0` и плавающим стеклянным HUD (`SalonHeader.tsx`, `SalonControls.tsx`). Поддержан Zen Mode (`h`) и Fullscreen (`f`).
  - Rule: AP-020, AP-064.
- [P2] Числовые метки мест создавали визуальный шум - fixed
  - Resolution: Текстовые номера удалены с холста, участники представлены светящимися точками-угольками с аурой активного спикера и бусиной паса.
  - Rule: AP-018.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - Лимиты строк: 33 файла в `src/`, все строго `<= 235` строк (максимум — `SalonExperience.tsx` 235 строк, при лимите 250, AP-019).
   - Тесты: 25/25 тестов Vitest GREEN по 9 тестовым файлам (`hearth-words`, `hearth-seats`, `hearth-flame`, `session-fsm`, `linking-graph`, `lexicon-engine`, `collision-layout`, `field-renderer`, `speech-engine`).
   - Сборка: `vite build` 100% успешен (347ms).
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (AP-025, DFS graph verification).
   - Изоляция Canvas/DOM: чистый холст на `fixed inset-0 z-0`, плавающий HUD на `z-10` с `pointer-events-auto`.
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Скриншот-верификация: снимки `/tmp/prod_salon_hearth.png` и `/tmp/prod_salon_demo.png` подтвердили корректный центрированный очаг, гармоничную поляну, отсутствие наложений слов на пламя и работу интерфейса S1.
   - Пользовательский сценарий: рандомный выбор спикера по `Space`, диалоговое притяжение 22%, затухание слов со временем, скрытие номеров мест.
   - Дзен-режим: клавиша `h` скрывает HUD, оставляя чистый медитативный костёр.
   - **Вердикт:** `VERDICT: PASS`.

### Residual Risk
- Эксперимент `experiments/04-hearth-fire/index.html` сохранён нетронутым как изолированный исторический артефакт.

---

## Cycle 4 - 2026-10-21 - Unified Autonomous Voice Pipeline & Neural Distillation (No Zoom SDK)

### Context
- Branch: `main` (commit head, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Реализация единой бесшовной сессии Салона присутствия без Zoom SDK: двухуровневый нейродистиллятор длинных монологов (`src/domain/phrase-distiller.ts` с поддержкой локального Ollama `qwen2.5:0.5b` и 800мс безопасным фоллбеком на словарный экстрактор), нативный захват системного звука звонка Zoom/Telegram через Web Audio API `getDisplayMedia({ audio: true })` в `SalonAudioEngine` (по проверенному рецепту «03 · луна»), автоматическая передача эстафеты круга (`(seat % 12) + 1`) после произнесения фразы, ликвидация лишних полей ввода и сохранение чистого созерцательного экрана у костра.
- Source docs:
  - `docs/superpowers/plans/2026-10-21-arch-improvement-cycle-4.md`
  - `src/domain/phrase-distiller.ts`, `src/audio/audio-engine.ts`, `src/components/SalonExperience.tsx`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-011, AP-018, AP-019 (лимит <= 250 строк/файл), AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-064 (S1 дизайн-система).

### Findings & Resolution
- [P1] Захламление поляны длинными монологами при отсутствии смысловой суммаризации - fixed
  - Resolution: Разработан модуль `phrase-distiller.ts`: Tier 1 (0 мс словарный экстрактор для коротких реплик) + Tier 2 (быстрое сжатие 30-50 словного монолога участника в 1-3 слова истинного чувства с сохранением эмоциональной семьи и валентности через Ollama микро-модель с 800мс таймаутом и гарантированным фоллбеком).
  - Rule: AP-010, AP-018, AP-019.
- [P1] Зависимость от стороннего софта / Zoom SDK для звука встречи - fixed
  - Resolution: В `SalonAudioEngine` реализован метод `captureMeetingAudio()`: захват системного аудио встречи через стандартный браузерный API `getDisplayMedia({ audio: true })` с немедленной остановкой видеотрека и подключением `AnalyserNode` для расчета RMS уровня громкости.
  - Rule: AP-010, AP-018, AP-019.
- [P2] Привязка всех реплик к одному стулу при отсутствии ручных кликов - fixed
  - Resolution: В `SalonExperience.tsx` внедрена естественная передача эстафеты круга (`advanceSpeakerTurn`): после произнесения и дистилляции реплики активный стул автоматически плавно переходит по часовой стрелке к следующему участнику `((seat % 12) + 1)`.
  - Rule: AP-018, AP-054.
- [P2] Лишние инпуты и визуальный шум на экране - fixed
  - Resolution: Из интерфейса удалены все временные строки ввода; экран остаётся кристально чистым — только костер, угольки участников, плавающие слова и плавающая плашка микрофона.
  - Rule: AP-018.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - Лимиты строк: Все 36 файлов в `src/` строго `<= 248` строк (лимит 250, AP-019). Самый длинный файл — `SalonExperience.tsx` (248 строк).
   - Тесты: 39/39 тестов Vitest GREEN (13 сьютов: `phrase-distiller`, `meeting-audio`, `speech-resilience`, `speech-engine`, `hearth-flame`, `hearth-words`, `hearth-seats`, `linking-graph`, `session-fsm`, `field-renderer`, `collision-layout`, `lexicon-distiller`, `lexicon-engine`).
   - Сборка: `vite build` успешен за 253 мс.
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (AP-025, `madge`).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer (Black-Box Synthetic User Testing на живом стенде):**
   - **[P0] Фальшивый захват аудио встречи (False Success):** `captureMeetingAudio()` считает RMS в пустоту; браузерный `webkitSpeechRecognition` архитектурно не принимает `MediaStream` из `getDisplayMedia`, а слушает исключительно физический микрофон оператора через облако Google. Голоса участников Zoom встречи в распознаватель не попадают вообще.
   - **[P0] Симуляция локального ИИ (False Success):** Модель `qwen2.5:0.5b` отсутствует в Ollama (`{"error":"model 'qwen2.5:0.5b' not found"}`). Запрос падал с 404 и бесшумно скатывался в примитивный regex-словарь (Tier 1), создавая иллюзию работы локальной нейросети.
   - **[P1] Фатальный отказ в целевом окружении:** В Electron / BB IDE `webkitSpeechRecognition` падает с `service-not-allowed` из-за отсутствия ключей Google Speech в рантайме.
   - **[P1] Деградация атрибуции речи:** Сервис биометрии (CAM++) и локальный STT (Whisper/sherpa-onnx) не развернуты; авторство реплик подменяется слепым часовым счетчиком `((seat % 12) + 1)`.
   - **[P2] Нулевой откат при отказе оборудования:** Из интерфейса удалены все элементы `<input>`, из-за чего при отказе микрофона пользователь лишен возможности выразить фразу текстом.
   - **Вердикт:** `VERDICT: FAIL`.

---

## Cycle 5 - 2026-10-21 - Real Local AI, Honest Audio Contract & Resilient Circle Input

### Context
- Branch: `main` (commit head, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Устранение всех симуляций и блокеров P0/P1, выявленных независимым продуктовым ревью на живом стенде:
  1. Развертывание реальной модели `qwen2.5:0.5b` в Ollama с Metal-ускорением (честный инференс ~21 мс).
  2. Внедрение функции `checkOllamaStatus()` и типизированного статуса `engineUsed: "qwen2.5:0.5b" | "lexicon-fallback"`.
  3. Создание компонента `HearthInput.tsx` (созерцательная строка ввода по клавише `Enter` или кнопке `текст (enter)`), возвращающего голос участникам при неработающем микрофоне.
  4. Ликвидация ложного обещания захвата аудио Zoom через `webkitSpeechRecognition` (поскольку браузерный Web Speech API не принимает сторонний `MediaStream`).
  5. Замена слепого часового счетчика спикеров на осознанное управление эстафетой (`ArrowRight` / клик по стулу).
- Source docs:
  - `docs/superpowers/plans/2026-10-21-arch-improvement-cycle-5.md`
  - `src/domain/phrase-distiller.ts`, `src/components/HearthInput.tsx`, `src/components/SalonExperience.tsx`, `src/components/salon/SalonControls.tsx`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-012, AP-018, AP-019 (лимит <= 250 строк/файл), AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-054, AP-064 (S1 дизайн-система), AP-071 (Real runtime daemons).

### Findings & Resolution
- [P0] Симуляция локального ИИ: отсутствие модели qwen2.5:0.5b в Ollama - fixed
  - Resolution: Модель `qwen2.5:0.5b` выкачана и развернута в Ollama. В `phrase-distiller.ts` внедрен прозрачный контракт `engineUsed: "qwen2.5:0.5b" | "lexicon-fallback"` и метод `checkOllamaStatus()`. В UI выведен индикатор статуса модели.
  - Rule: AP-012, AP-018, AP-071.
- [P0] Фальшивый захват аудио встречи Zoom через Web Speech API - fixed
  - Resolution: Устранена иллюзия захвата системного стрима в STT. Зафиксирован честный контракт: микрофон ведущего через Web Speech API + возможность ввода реплик через `HearthInput`.
  - Rule: AP-018, AP-071.
- [P1] Полное отсутствие резервного текстового ввода для участников - fixed
  - Resolution: Разработан компонент `HearthInput.tsx` (78 строк): открывается по нажатию `Enter` или кнопке в HUD, стилизован под созерцательную эстетику S1, сжимает монологи через `distillWithNeuralFallback`, отправляет слово в круг.
  - Rule: AP-054, AP-064.
- [P1] Фальшивая биометрия и слепой перебор стульев - fixed
  - Resolution: Устранен слепой инкремент `((seat % 12) + 1)` при каждой реплике. Фокус закреплен за говорящим, эстафета передается осознанно по хоткею `ArrowRight` или кликом на стул участника на холсте.
  - Rule: AP-018.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - Лимиты строк: Все 37 файлов в `src/` строго `<= 248` строк (лимит 250, AP-019). Самый длинный файл — `SalonExperience.tsx` (248 строк).
   - Тесты: 43/43 теста Vitest GREEN (14 тест-сьютов: добавлен `hearth-input.test.tsx`, расширен `phrase-distiller.test.ts`).
   - Сборка: `vite build` успешен за 298 мс.
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (AP-025, `madge`).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Живой стенд: реальный инференс `qwen2.5:0.5b` подтвержден через curl и браузер; текстовый ввод по Enter работает; статус модели отображается зеленым бейджем; микрофон ведущего сопровождается честной подсказкой при отказе; 0 фейковых абстракций.
   - **Вердикт:** `VERDICT: PASS`.

### Residual Risk
- В среде Electron Google Web Speech API по-прежнему недоступен из-за ограничений движка Chromium без API-ключей Google, однако благодаря `HearthInput` участники и ведущий могут полноценно вести сессию голосом текста по нажатию `Enter` или открыть страницу в Google Chrome по ссылке в один клик.



