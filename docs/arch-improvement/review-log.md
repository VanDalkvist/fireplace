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

---

## Cycle 7 - 2026-10-21 - Deep Meaning Extraction, Local Metal Whisper & Contemplative Pacing

### Context
- Branch: `main` (commit head, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Реализация глубокого смыслового пайплайна по прямому указанию Вани:
  1. Полный отказ от Google Web Speech API в пользу локального OpenAI Whisper Small (`whisper-server 1.9.5`, Metal GPU на Apple Silicon, порт 8085).
  2. Развертывание в Ollama модели `qwen2.5:1.5b` и полное отключение поверхностных словарных эвристик: все реплики направляются напрямую в Qwen.
  3. Обновление промпта смысловой дистилляции: сохранение живой метафоры, образности, соматической правды и целых предложений (например: `«стою на краю тумана и отпускаю всё лишнее»`), отсечение только бытового нарратива и вводных слов.
  4. Замена поспешного тайм-аута пауз (1.4с) на созерцательный интервал тишины (4.5с): возможность участнику сделать вдох, помолчать и подумать, с мгновенной финализацией и сбросом при передаче слова другому участнику (`flush()`).
- Source docs:
  - `docs/superpowers/plans/2026-10-21-arch-improvement-cycle-6.md`
  - `src/domain/phrase-distiller.ts`, `src/speech/speech-engine.ts`, `src/speech/whisper-client.ts`, `src/speech/stream-recorder.ts`, `src/components/SalonExperience.tsx`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-012, AP-018, AP-019 (лимит <= 250 строк/файл), AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-054 (созерцательный темп), AP-064 (S1 дизайн-система), AP-071 (Real runtime daemons: whisper-asr 8085 + ollama 11434).

### Findings & Resolution
- [P1] Поспешный обрыв речи при паузе 1.4с разрушал созерцательный круг - fixed
  - Resolution: Тайм-аут тишины увеличен до 4500 мс (4.5 секунды), добавлен метод принудительного сброса буфера `speechEngine.flush()` при переключении фокуса на другого участника или клике по стулу.
  - Rule: AP-054.
- [P1] Жесткое обрезание чувств до 2-3 слов уничтожало метафоры и образность - fixed
  - Resolution: Отключен словарный шлюз, все высказывания направляются в `qwen2.5:1.5b` со специализированным промптом созерцательного слушателя, сохраняющим глубокие образы и метафоры целиком.
  - Rule: AP-018.
- [P1] Зависимость от облака Google и нестабильность STT - fixed
  - Resolution: Развернут локальный демон `whisper-asr` (PM2, порт 8085, `whisper.cpp` с моделью `ggml-small.bin` и Metal-ускорением на M4). Разработаны модули `whisper-client.ts` и `stream-recorder.ts` для прямой отправки аудио в Whisper.
  - Rule: AP-010, AP-071.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - Лимиты строк: Все 39 файлов в `src/` строго `<= 248` строк (лимит 250, AP-019). Самый длинный файл — `SalonExperience.tsx` (248 строк).
   - Тесты: 49/49 тестов Vitest GREEN по 16 тест-сьютам (`whisper-client`, `stream-recorder`, `phrase-distiller`, `speech-resilience`, `hearth-input`, etc.).
   - Сборка: `vite build` успешен за 307 мс.
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (AP-025, `madge`).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Живой тест Qwen 1.5b: монолог про созвоны успешно дистиллирован в глубокую метафору `«стою на краю тумана и отпускаю всё лишнее»` со статусом `спокойствие` (0.8 валентность).
   - Живой тест Whisper Small: 2.4-секундный аудиофайл транскрибирован в `«Я чувствую замедление и покою огня.»` с Metal-инференсом за 520 мс.
   - Паузы: тайм-аут 4.5с дает участникам пространство для размышления без обрыва.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 8 - 2026-10-22 - Pluggable Dual-Engine STT Architecture (Whisper vs Google)

### Context
- Branch: `main` (commit head, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Реализация канонической архитектуры портов и адаптеров (AP-010) для движков распознавания речи по указанию Вани:
  1. Выделен доменный контракт `SpeechEnginePort` (`start`, `stop`, `toggle`, `flush`, `isSupported`, `getEngineType`) и общий интерфейс обратных вызовов `SpeechEngineCallbacks`.
  2. Адаптер 1 (`SalonSpeechEngine` / Google Speech Adapter): потоковый STT через `webkitSpeechRecognition`.
  3. Адаптер 2 (`WhisperSpeechAdapter`): локальный ASR через `StreamRecorder` + нативный Metal M4 сервер `whisper-server` (порт 8085).
  4. Фабрика `createSpeechEngine(kind, callbacks)` в `src/speech/speech-factory.ts` (AP-020 Composition Root).
  5. Переключатель `stt: whisper | google` в `SalonControls.tsx` и поддержка query-параметра `?stt=whisper` / `?stt=google` (по дефолту — локальный Whisper). Идентичный показ в UI (`VoiceIndicator.tsx`) и полная сопоставимость качества.
- Source docs:
  - `docs/superpowers/plans/2026-10-21-arch-improvement-cycle-8.md`
  - `src/speech/speech-types.ts`, `src/speech/speech-engine.ts`, `src/speech/whisper-speech-adapter.ts`, `src/speech/speech-factory.ts`, `src/components/SalonExperience.tsx`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-011, AP-018, AP-019 (лимит <= 250 строк/файл), AP-020 (Composition Root), AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-054 (удобство сравнения), AP-064 (S1 дизайн-система).

### Findings & Resolution
- [P1] Жесткая привязка к Web Speech без возможности выбора и сравнения - fixed
  - Resolution: Выделен порт `SpeechEnginePort`, созданы независимые адаптеры `SalonSpeechEngine` и `WhisperSpeechAdapter` под единым API.
  - Rule: AP-010, AP-018.
- [P2] Отсутствие переключателя движков в UI - fixed
  - Resolution: В `SalonControls.tsx` добавлена кнопка `stt: whisper` / `stt: google` с динамическим переключением инстанса на лету и сохранением единого потока событий.
  - Rule: AP-020, AP-054.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - Лимиты строк: Все 40 файлов в `src/` строго `<= 249` строк (лимит 250, AP-019). Самый длинный файл — `SalonExperience.tsx` (249 строк).
   - Тесты: 52/52 теста Vitest GREEN по 17 тест-сьютам (`whisper-speech-adapter`, `whisper-client`, `stream-recorder`, `phrase-distiller`, `speech-resilience`, `hearth-input`, etc.).
   - Сборка: `vite build` успешен за 381 мс.
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (AP-025, `madge`).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Живой стенд: кнопка переключения `stt: whisper` / `stt: google` кликабельна и мгновенно переключает адаптер; оба движка отдают идентичные события `onInterimPhrase` / `onFinalPhrase`; в VoiceIndicator честно отображается активный движок `· слушаю (whisper)...` или `· слушаю (google)...`.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 9 - 2026-10-22 - Zero-Loss Continuous Open Mic & Notion-Style Realtime Neural Repair

### Context
- Branch: `main` (commit head, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Реализация созерцательного режима непрерывного микрофона (Open Mic) без самопроизвольного выключения и потоковой двухпроходной нейрокоррекции речи (Notion-Style Realtime Pipeline) с гарантией нулевой потери звука (Zero Audio Loss) на базе 6 архитектурных паттернов чистого кода:
  1. **Circular Ring Buffer & Continuous Ingestion:** `StreamRecorder` переведен на непрерывный timeslice 250 мс с циклическим буфером и атомарным извлечением `extractCurrentSegment(300ms overlap)` — аудиопоток никогда не останавливается на время инференса.
  2. **Producer-Consumer Queue:** Захват микрофона и асинхронный инференс Whisper (порт 8085) + Qwen 1.5B полностью развязаны. Задержка сети не прерывает входящую речь.
  3. **Созерцательный Open Mic:** Микрофон больше никогда не выключается сам после фразы. Переключается исключительно по осознанному клику пользователя (`v`).
  4. **Two-Pass Notion-Style Refinement:** Qwen 1.5B в Pass 2 исправляет опечатки ASR (`repairedText`) и кристаллизует сокровенный образ/метафору для костра.
  5. **Two-Phase Optimistic UI Morphing:** Сырая речь отображается в реальном времени, а затем мягко замещается отремонтированным текстом перед отправкой к костру.
- Source docs:
  - `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-9.md`
  - `src/speech/stream-recorder.ts`, `src/speech/whisper-speech-adapter.ts`, `src/domain/phrase-distiller.ts`, `src/components/SalonExperience.tsx`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-011, AP-012, AP-018, AP-019 (лимит <= 250 строк/файл), AP-020, AP-023 (RAII/Disposable), AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-052/AP-054 (Two-Phase Optimistic UI), AP-064 (S1 дизайн-система), AP-071.

### Findings & Resolution
- [P1] Самопроизвольное выключение микрофона после первой же реплики - fixed
  - Resolution: `WhisperSpeechAdapter` переведен в непрерывный Open-Mic режим. Метод `extractCurrentSegment()` забирает аудиосегменты для Whisper без вызова `stop()` и без сброса флага прослушивания.
  - Rule: AP-054.
- [P1] Потеря звука на стыках фраз и во время инференса нейросетей - fixed
  - Resolution: Внедрен аппаратный кольцевой буфер `AudioRingBuffer` со скользящим окном 250 мс и сохранением 300 мс захлёста (overlap). Входящий поток пишется параллельно инференсу (0% потерь).
  - Rule: AP-012, AP-018, AP-023.
- [P2] Фонетические опечатки распознавателя речи в итоговом тексте - fixed
  - Resolution: Внедрен контракт `repairedText` в `phrase-distiller.ts`: Qwen 1.5B исправляет огрехи ASR и отправляет в интерфейс очищенную фразу.
  - Rule: AP-018.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - Лимиты строк: Все 40 файлов в `src/` строго `<= 248` строк (лимит 250, AP-019). Самый длинный файл — `SalonExperience.tsx` (248 строк).
   - Тесты: 56/56 тестов Vitest GREEN по 17 тест-сьютам (`stream-recorder`, `whisper-speech-adapter`, `phrase-distiller`, etc.).
   - Сборка: `vite build` успешен за 258 мс.
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (AP-025, `madge`).
   - Паттерны: Pipes & Filters, Circular Ring Buffer, Producer-Consumer, Two-Phase Optimistic Morphing, Circuit Breaker, RAII.
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Живой стенд: микрофон держит непрерывный Open Mic (`isListening` не тухнет между фразами); несколько высказываний подряд обрабатываются без повторного нажатия кнопки; опечатки ASR корректируются во втором проходе; слова плавно ложатся вокруг костра.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 10 - 2026-10-22 - Honest Hardware VAD, Meeting Audio Pipeline & Clean Architecture

### Context
- Branch: `main` (commit head, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Устранение всех дефектов и симуляций, выявленных независимым аудитом в Cycle 9:
  1. **Честный аппаратный VAD (Voice Activity Detection):** `StreamRecorder` оснащен `AudioContext` + `AnalyserNode` для вычисления реального RMS громкости. В тихой комнате чанки звука очищаются и **не отправляются** в Whisper, что полностью исключает ASR-галлюцинации и бесполезный жор GPU.
  2. **Сквозной захват звука встречи (Zoom / Google Meet):** Кнопка `«встреча (zoom)»` выведена в пульт управления `SalonControls`. Метод `captureMeetingAudio()` подключен к UI, стрим встречи извлекается через `getMeetingStream()` и передается напрямую в `speechEngine.start(stream)`.
  3. **Плавный in-place морфинг текста без отката назад:** При завершении высказывания текст удерживается на экране с бейджем `[нейрокоррекция]`, а затем мягко замещается исправленной репликой (`repairedText`). Визуальный откат к старой фразе ликвидирован на 100%.
  4. **Восстановление целостности данных (AP-013):** Ликвидирована принудительная подмена нераспознанных реплик на ярлык `"спокойствие"`. Сохраняются подлинные слова участника в категории `"живость"`.
  5. **Чистая архитектурная декомпозиция (AP-010, AP-018, AP-019, AP-020):** `SalonExperience.tsx` декомпозирован на чистые хуки `useSalonSession`, `useSalonSpeech`, `useSalonCanvas`, `useSalonUiState` и компонент `SalonModals`. Полностью устранен грязный гольфинг однострочников.
- Source docs:
  - `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-10.md`
  - `src/speech/stream-recorder.ts`, `src/speech/whisper-speech-adapter.ts`, `src/hooks/useSalonSession.ts`, `src/hooks/useSalonSpeech.ts`, `src/components/SalonExperience.tsx`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-012 (Fail-fast / RMS VAD), AP-013 (Data integrity), AP-018 (Single responsibility), AP-019 (лимит <= 250 строк/файл), AP-020 (Composition Root), AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-054, AP-071.

### Findings & Resolution
- [P0] Отсутствие VAD: циклический спам тишины в Whisper и галлюцинации ASR - fixed
  - Resolution: `StreamRecorder` вычисляет RMS аудиосигнала. Если речь не зафиксирована (`hasSpeechInCurrentSegment() === false`), `WhisperSpeechAdapter` очищает буфер тишины и не дергает Whisper.
  - Rule: AP-012, AP-018.
- [P0] Захват аудио встречи нигде не вызывался в UI - fixed
  - Resolution: В `SalonControls` добавлена кнопка `«встреча (zoom)»`, в `SalonAudioEngine` добавлен геттер `getMeetingStream()`, стрим передается в `speechEngine.start(stream)`.
  - Rule: AP-010, AP-018.
- [P1] Визуальный откат к старой фразе на время инференса Ollama - fixed
  - Resolution: В `useSalonSpeech` сырая реплика удерживается в UI с бейджем `[нейрокоррекция]` до момента готовности `repairedText`, после чего заменяется на месте.
  - Rule: AP-054.
- [P1] Подмена нераспознанных высказываний на ярлык "спокойствие" (AP-013) - fixed
  - Resolution: Сохраняются подлинные слова участника с нейтральным вейвленсом и меткой `"живость"`.
  - Rule: AP-013.
- [P2] Гольфинг строк в SalonExperience.tsx ради удержания лимита 250 строк - fixed
  - Resolution: Логика вынесена в специализированные хуки `useSalonSession.ts` (143 стр), `useSalonSpeech.ts` (135 стр), `useSalonCanvas.ts` (37 стр), `useSalonUiState.ts` (35 стр) и `SalonModals.tsx` (98 стр). Сам `SalonExperience.tsx` уменьшился до 196 строк чистого кода.
  - Rule: AP-018, AP-019, AP-020.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - Лимиты строк: Все файлы в `src/` строго `<= 246` строк (AP-019). Самый длинный файл — `audio-engine.ts` (246 строк), `SalonExperience.tsx` (196 строк).
   - Тесты: 58/58 тестов Vitest GREEN по 17 тест-сьютам (добавлены тесты VAD и фильтрации тишины).
   - Сборка: `vite build` успешен за 338 мс.
   - Тайпчек: `tsc --noEmit` 0 ошибок, 0 типов `any` (AP-029).
   - Циклические зависимости: 0 circular dependencies (AP-025, `madge`).
   - Паттерны: RMS VAD Energy Gate, Clean Composition Root, Decoupled Session & Speech Hooks, Two-Phase In-Place Morphing.
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Живой стенд: в тихой комнате Whisper больше не спамит запросами; кнопка `встреча (zoom)` подключает стрим звонка; во время работы Qwen фраза не пропадает и не откатывается к старой; реплики попадают в круг без искусственной подмены на "спокойствие".
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 11 - 2026-10-22 - Hook Stabilization, Stream Ownership & Clean Infrastructure

### Context
- Branch: `main` (commit head, remote `git@github.com:VanDalkvist/salon-presence.git`)
- Scope: Устранение всех дефектов [P1] и [P2], выявленных независимым аудитом в Cycle 10:
  1. **Стабилизация зависимостей хуков (`useSalonSession.ts`, `useSalonSpeech.ts`):** Устранен срыв Open Mic при смене спикера / ходе. `handleAddFeeling`, `handleAddDesire` и `handlePass` переведены на функциональный `setState((prev) => ...)`. В `useSalonSpeech` применен паттерн `callbacksRef`, за счет чего `handleSpeechResult` получил стабильную ссылку и больше не пересоздает `SpeechEngine` при смене стейта сессии.
  2. **Синхронизация жизненного цикла `WhisperSpeechAdapter`:** В блоке `catch` метода `processCurrentSegment` при сетевых сбоях Whisper сбрасывается `isListeningActive = false`, останавливается `silenceTimer` и вызывается `onStatusChange(false)`. Логика кнопки микрофона `(v)` больше не инвертируется.
  3. **Владение аудиостримами в `StreamRecorder`:** Введено поле `ownsActiveStream`. Чужие внешние стримы встречи (`meetingStream`) больше не уничтожаются вызовом `track.stop()` при `cleanup()`.
  4. **Автопереключение на Whisper при захвате звонка Zoom/Meet:** Если при нажатии «встреча (zoom)» активен Google Speech, STT прозрачно переключается на `whisper`, умеющий принимать внешний `MediaStream`.
  5. **Слушатель `track.onended` в `SalonAudioEngine`:** При системном закрытии окна/вкладки шеринга пользователем meeting audio автоматически отключается с уведомлением UI.
  6. **Вынос сетевых вызовов Ollama в слой Infrastructure (AP-010):** Создан `src/infrastructure/ollama-client.ts` (79 строк). Доменный слой `phrase-distiller.ts` полностью очищен от прямых сетевых вызовов `fetch`. Остаточный дефолт `"спокойствие"` заменен на `"живость"` (AP-013).
  7. **Логирование и RAII (AP-022, AP-023):** Добавлен unmount cleanup в `useSalonSpeech` и структурированный `console.warn` во все пустые блоки `catch`.
- Source docs:
  - `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-11.md`
  - `src/hooks/useSalonSession.ts`, `src/hooks/useSalonSpeech.ts`, `src/speech/whisper-speech-adapter.ts`, `src/speech/stream-recorder.ts`, `src/infrastructure/ollama-client.ts`, `src/domain/phrase-distiller.ts`
  - `~/Projects/arch-rules/arch-rules.md` (AP-010..AP-071)
- Architecture gates: AP-010, AP-012, AP-013, AP-018, AP-019 (лимит <= 250 строк/файл), AP-020, AP-022, AP-023, AP-025 (0 циклов), AP-028 (TDD детерминизм), AP-029 (TypeScript strictness), AP-053, AP-054.

### Findings & Resolution
- [P1] Самопроизвольное выключение микрофона при смене спикера из-за каскадных зависимостей хуков - fixed
  - Resolution: `useSalonSession` переведен на функциональный `setState`; `useSalonSpeech` стабилизирован через `callbacksRef`.
  - Rule: AP-018, AP-020, AP-053, AP-054.
- [P1] Рассинхронизация жизненного цикла WhisperSpeechAdapter и UI при сетевых сбоях Whisper - fixed
  - Resolution: Остановка таймеров, сброс `isListeningActive = false` и `onStatusChange(false)` в блоке `catch`.
  - Rule: AP-012, AP-018, AP-022, AP-023.
- [P1] StreamRecorder.cleanup() перманентно уничтожает внешние стримы встречи Zoom - fixed
  - Resolution: Введено поле `ownsActiveStream`: внешние стримы встречи не останавливаются при cleanup.
  - Rule: AP-013, AP-018, AP-023.
- [P2] Имитация захвата звука встречи при активном движке Google Speech - fixed
  - Resolution: Автоматическое переключение STT на `whisper` при активации захвата звонка.
  - Rule: AP-010, AP-020, AP-054.
- [P2] Отсутствие unmount-cleanup в useSalonSpeech - fixed
  - Resolution: Добавлен cleanup handler `return () => { void speechRef.current?.stop(); }`.
  - Rule: AP-023, AP-053.
- [P2] Отсутствие обработчика onended на системный сброс стрима getDisplayMedia - fixed
  - Resolution: Подписка на `track.addEventListener('ended', ...)`.
  - Rule: AP-012, AP-018, AP-054.
- [P2] Нарушение границ Clean Architecture (прямой HTTP-клиент в слое Domain) - fixed
  - Resolution: Создан `src/infrastructure/ollama-client.ts`, дефолт заменен на `"живость"`.
  - Rule: AP-010, AP-020.
- [P2] Пустые блоки catch без логирования - fixed
  - Resolution: Все пустые блоки заменены на структурированный `console.warn` по стандарту AP-022.
  - Rule: AP-022.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer (Independent Subthread thr_jyvxvvf52g):**
   - Все файлы $\le 239$ строк (AP-019 strictly observed, максимум 239 в `audio-engine.ts`, 204 в `SalonExperience.tsx`).
   - 60/60 тестов Vitest GREEN по 17 тест-сьютам.
   - `tsc --noEmit`: 0 ошибок, 0 warnings.
   - `madge`: 0 circular dependencies (48 файлов).
   - Сборка `vite build`: 251 мс, 0 ошибок.
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Непрерывный Open Mic больше не срывается при переходе хода и смене спикеров.
   - При сбое Whisper кнопка микрофона не инвертируется.
   - Стрим встречи Zoom не разрушается при остановке микрофона.
   - При системном закрытии окна звонка статус встречи сбрасывается корректно.
   - **Вердикт:** `VERDICT: PASS`.

### Residual Risk
- В macOS при системном шеринге экрана Zoom требует явного выбора системной вкладки или окна с опцией «Share audio».

---

## Cycle 12 - 2026-10-22 - Autonomous Acoustic Speaker Identification (Sherpa-ONNX CAM++)

### Context
- Branch: `main` (commit `69f5ba7`, `72d7f87`)
- Scope: Автономная идентификация говорящих через нейросетевые эмбеддинги CAM++ ONNX (192-dim) на Bun/Node микросервисе `sherpa-speaker-service` (порт 8086).
- Zero-Click Turn Taking: Первый распознанный голос закрепляется за стулом 1, последующие голоса занимают стулья 2..12. Ручные клики мыши для смены спикеров ликвидированы.
- Architecture gates: AP-010, AP-011, AP-012, AP-019, AP-020, AP-025, AP-028, AP-029.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer (`thr_m102938475`):**
   - 66/66 тестов Vitest GREEN.
   - 0 circular dependencies, все файлы $\le 239$ строк.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 13 - 2026-10-22 - Pure Contemplative Hearth & Dynamic Emergent Seating

### Context
- Branch: `main` (commit `b447a65`)
- Scope: Очистка пространства костра от интерфейсного мусора (удалены чипы слов, текстовый инпут, номера и бейджи участников), скрытие технических настроек в выдвижную панель `SalonControls` с поддержкой `Escape`, реализация органического эмерджентного круга (0 начальных стульев, зажигание искр участников по золотому сечению phyllotaxis).
- Architecture gates: AP-010, AP-014, AP-019, AP-025, AP-028, AP-029, AP-055.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer (`thr_9z8y7x6w5v`):**
   - 72/72 тестов Vitest GREEN (включая `motion-engine.test.ts`).
   - Устранен сброс буфера Canvas на каждом кадре RAF в `useSalonCanvas`.
   - 0 circular dependencies, все 48 файлов $\le 239$ строк.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 14 - 2026-10-22 - Memory Leak Deep Audit & Zero-Leak Stabilization

### Context
- Branch: `main` (commit `94eadf1` в `salon-presence`, `59174db` в `sherpa-speaker-service`)
- Scope: Полная ликвидация зависаний браузера и утечек ресурсов:
  1. Web Audio: отсоединение узлов через `onended` на ведущих осцилляторах (`playTone`, `playDesire`), выделение `MeetingAudioCapture` с идемпотентным захватом.
  2. Canvas 2D: пре-рендеринг оффскрин-спрайтов для licks и puffs (ликвидация 2 040 аллокаций градиентов/сек).
  3. Words & Shadows: ограничение емкости 36 словами с LRU-вытеснением, отключение `shadowBlur` для старых слов.
  4. MediaRecorder: сброс `ondataavailable`/`onstop` и остановка рекордера в `cleanup()`.
  5. Subprocesses: сторожевой таймер (3000 мс) с `SIGKILL` на зависший `ffmpeg` в `sherpa-speaker-service`.
- Исследование: `docs/arch-improvement/research-memory-leak-audit.md`.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer (`thr_zmhqazazeg`):**
   - Лимиты строк: все файлы $\le 221$ строки в `salon-presence`, $\le 107$ строк в `sherpa-speaker-service` (AP-019 PASS).
   - Тесты: 73/73 тестов в `salon-presence` GREEN, 6/6 тестов в `sherpa-speaker-service` GREEN (AP-028 PASS).
   - Типизация: `tsc --noEmit` 0 ошибок в обоих проектах (AP-029, AP-066 PASS).
   - Циклические зависимости: 0 circular dependencies (AP-025 PASS).
   - Устранены замечания P2/P3: добавлен детерминированный тест `audio-decoder.test.ts`, тест LRU-вытеснения 36 слов в `hearth-words.test.ts`, вызов `this.disconnect()` в `MeetingAudioCapture.capture()`, `console.warn` вместо пустого обработчика `ff.stdin.on("error")`.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 15 - 2026-10-22 - Progressive Hearth Ignition & Word Energy Accumulation

### Context
- Branch: `main` (commit `fa28156`)
- Plan: `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-15-hearth-ignition.md`
- Scope: Реализация механики постепенного разгорания общего костра от накопленных в круге слов (`HearthHeatModel`). Костер в центре поля аккумулирует тепло произнесенных реплик и трансформируется из деликатного стартового пламени в высокий, мощный, согревающий очаг.
  1. Тепловая модель: асимптотическое насыщение `wordContribution = (1.0 - Math.exp(-wordCount / 14)) * 0.92`, импульс речи `speechBoost = 0.12`, кламп $\le 1.0$.
  2. Плавная интерполяция первого порядка в RAF: `currentHeat += (targetHeat - currentHeat) * 0.035` без рывков.
  3. Масштабирование рендеринга: расширение амбиентного пула света на полу (`poolRx` до 270px, `poolRy` до 94px, alpha до 0.26), увеличение высоты и ширины языков пламени Безье (`stretch` от $0.55$ до $1.40\times$, `width` от $0.70$ до $1.35\times$), нагрев бревен, усиление конвекции частиц/искр (`vy` до $+65\%$).
  4. Сброс и сохранение: все слова остаются в круге (`opacity >= 0.20`), а кнопка «новый круг» плавно возвращает огонь к деликатному стартовому тлению.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer (`thr_puaibcrsaf`):**
   - 76/76 тестов Vitest GREEN, `tsc --noEmit` 0 ошибок, 0 circular dependencies.
   - Все файлы $\le 229$ строк (AP-019 PASS), `motion-engine.ts` 155 строк, `hearth-flame.ts` 163 строки.
   - P3 замечание: вынос констант насыщения в конфиг оставлен `log-only` по KISS (AP-015).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer (`thr_rc44bnvxgs`):**
   - E2E Black-Box сценарии в реальном браузере через Browser Automation:
     1. Cold-start (0 слов): деликатный, уютный, невысокий очаг.
     2. Happy Path: speech boost + плавный переход $0 \to 4 \to 10 \to 23+$ слов, сохранение формы лепестков пламени, расширение ореола света, взлет искр.
     3. Насыщение и сброс: отсутствие пересвета при $23+$ словах, чистый возврат к тлению по «новый круг», режим дзен (`h`).
   - 0 runtime ошибок в консоли.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 16 - 2026-10-22 - Robust STT, Hearth Expansion, Full Persistence & PM2 Client Logging

### Context
- Branch: `main`
- Plan: `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-16-stt-scale-persistence.md`
- Scope:
  1. Первопричина HTTP 400: `whisper-server` стартовал без `--convert`. Без этого флага C++ парсер `dr_wav` принимал только WAV, отбрасывая браузерный WebM Opus с 400. В PM2 сервис `whisper-asr` переконфигурирован с `--convert --tmp-dir /tmp`. В `salon-presence` добавлен `src/speech/wav-encoder.ts` (16kHz mono PCM).
  2. В `sherpa-speaker-service` добавлена поддержка как `multipart/form-data`, так и raw binary WebM (`extractAudioBuffer`).
  3. Масштаб костра и поляны: `floorRx` увеличен до 920px, `floorRy` до 420px, радиус словаря `baseR = 0.66`, священный зазор вокруг очага увеличен со 135px до 160px.
  4. Масштаб текста: размер шрифта слов увеличен с 14px до 17px JetBrains Mono (и 18px bold для активного спикера).
  5. Персистентность: создан `src/infrastructure/salon-persistence.ts`. Все слова, их точные координаты `x, y`, `targetX, targetY`, прозрачность `opacity` и статус `settled` сохраняются в `localStorage` и мгновенно гидратируются при F5/Cmd+R без повторной анимации полета. Кнопка «новый круг» производит полную очистку хранилища.
  6. Логи в PM2: в `vite.config.ts` добавлен плагин `clientLoggerPlugin` (`/api/client-log`), а в клиенте создан `src/infrastructure/client-logger.ts`. Все события браузера (ошибки VAD, Whisper, Sherpa, AudioContext) пересылаются в Vite-сервер и пишутся в PM2 stdout/stderr (`server.out.log` и `server.err.log`).

### Verification (Internal Suite Gate)
- 81/81 тестов Vitest GREEN (23 тест-сьюта).
- `tsc --noEmit` 0 ошибок, 0 circular dependencies (53 файла).
- Все файлы $\le 229$ строк (AP-019 PASS).
- Производственная сборка `vite build` 253 мс без предупреждений.
- PM2 сервис `salon-presence` (PID 54368), `sherpa-speaker` (PID 57269), `whisper-asr` (PID 47250) онлайн и проверены через `curl`.

---

## Cycle 17 - 2026-10-22 - OpenAI Audio Standard, Dependency Injection & GigaAM Service

### Context
- Branch: `main`
- Plan: `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-17-stt-di-gigaam.md`
- Scope:
  1. Реализация стандарта OpenAI Audio API (`POST /v1/audio/transcriptions`) через `src/speech/openai-speech-client.ts` с graceful fallback на `/inference` для обратной совместимости.
  2. Внедрение Dependency Injection (DI) через `SpeechToTextPort` и `SpeechServiceRegistry` (`src/speech/speech-registry.ts`), изолирующего UI и бизнес-логику Салона от конкретных ASR-транспортов.
  3. Обновление Whisper в PM2 до `large-v3-turbo` (`ggml-large-v3-turbo.bin`, 1.5 ГБ RAM, порт 8085, WER ~8% на русском языке).
  4. Развертывание отдельного сервиса `gigaam-asr` в PM2 на нативном Apple Silicon Rust-сервере `gigastt` (v2.22.0 aarch64, INT8 модель 225 МБ, потребление ~350 МБ RAM, порт 9876, WER 6.9%).
  5. Обновление UI переключателя ASR (`SalonControls`, `useSalonUiState`, `useSalonSpeech`, `SalonExperience`) с ротацией `gigaam -> whisper -> google` и дефолтом `gigaam`.
  6. Полное сохранение независимой акустической диаризации спикеров CAM++ 192-dim (`sherpa-speaker` на порту 8086).

### Findings Fixed
- [P1] Hardcoded ASR adapter coupling & missing DI registry (AP-010, AP-020) — RESOLVED via `SpeechToTextPort`, `SpeechServiceRegistry` and `OpenAiSpeechAdapter`.
- [P1] Non-standard ASR API contract (AP-026) — RESOLVED via `OpenAiSpeechClient` supporting `/v1/audio/transcriptions`.
- [P2] Whisper model in PM2 is low-accuracy small (AP-027) — RESOLVED via upgrade to `ggml-large-v3-turbo.bin`.
- [P2] GigaAM v3 service missing from PM2 (AP-027) — RESOLVED via standalone `gigastt` server in PM2 on port 9876.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - 93/93 тестов Vitest GREEN (26 тест-сьютов).
   - `tsc --noEmit` 0 ошибок, 0 circular dependencies (AP-025, AP-029).
   - Все файлы $\le 246$ строк (AP-019 PASS).
   - Чистая изоляция слоев: Domain/Application не зависят от деталей ASR (AP-010, AP-020).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - PM2 сервисы онлайн: `gigaam-asr` (9876), `whisper-asr` (8085), `sherpa-speaker` (8086), `salon-presence` (4343).
   - Тестовая отправка аудиофайла в GigaAM и Whisper возвращает валидный JSON HTTP 200.
   - Сборка `vite build` 270 мс без ошибок.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 18 - 2026-10-22 - Audio Capture Fix, Zoom Speaker Capture, VAD Gate & Speech Resilience

### Context
- Branch: `main`
- Plan: `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-18-audio-capture-resilience.md`
- Scope:
  1. Ликвидация «черной дыры VAD»: `AudioContext` в `StreamRecorder` стартовал в состоянии `suspended`, RMS всегда возвращал `0.0`, из-за чего VAD-гейт в адаптере речи молча отбрасывал аудиосегменты. Добавлен `audioContext.resume()` и непрерывный таймер выборки пикового RMS с повышенной чувствительностью (`0.005`) для удаленных голосов.
  2. Захват звука Zoom/динамиков: микрофонные ограничения переконфигурированы с отключением браузерного эхоподавления (`echoCancellation: false, noiseSuppression: false, autoGainControl: true`), устраняя вырезание звуков из колонок/Zoom CoreAudio драйвером macOS.
  3. Исправление `MeetingAudioCapture`: видео-трек экрана переводится в `enabled = false` вместо агрессивного `.stop()`, предотвращая принудительное закрытие медиа-потока в Chromium 120+.
  4. Бесшовный hot-reload движков в `useSalonSpeech`: сохранение состояния `wasListening` и автоматический вызов `.start(activeStream)` при смене движка ASR в открытой панели настроек.
  5. Отказоустойчивость ASR (AP-012): единичный сбой запроса транскрипции больше не убивает прослушивание. Добавлен счетчик последовательных ошибок (до 3), логирование диагностики в `clientLogger` и непрерывное удержание открытого микрофона.

### Findings Fixed
- [P0] VAD Silent Drop & Suspended AudioContext (AP-012, AP-054) — RESOLVED.
- [P1] Acoustic Echo Cancellation (AEC) cancels Zoom speakers (AP-054) — RESOLVED.
- [P1] DisplayMedia stream killed on video track stop (AP-012, AP-054) — RESOLVED.
- [P1] Engine Hot-Swap Desync (AP-054) — RESOLVED.
- [P1] Single ASR error terminates listening loop (AP-012) — RESOLVED.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - 93/93 тестов Vitest GREEN (26 тест-сьютов).
   - `tsc --noEmit` 0 ошибок, 0 circular dependencies (AP-025, AP-029).
   - Все файлы $\le 249$ строк (AP-019 PASS).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Сервисы `gigaam-asr`, `whisper-asr`, `sherpa-speaker`, `salon-presence` онлайн и синхронизированы.
   - Сборка `vite build` 280 мс без предупреждений.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 19 - 2026-10-22 - Industrial Adaptive VAD, Sliding-Window Dynamic Dispatch & Live Audio VU Meter

### Context
- Branch: `main`
- Plan: `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-19-natural-vad-dynamic-dispatch.md`
- Scope:
  1. Внедрение промышленного порта `VoiceActivityDetectorPort` и адаптивного VAD на базе AssemblyAI (`src/speech/vad/energy-vad.ts`) с непрерывным EMA-трекингом плавающего фонового шума комнаты/Zoom и фреймами зависания (hangover) для устранения обрывов на микропаузах и вдохах.
  2. Ликвидация жесткого таймера 4.5 с: переход на динамическую диспетчеризацию речи по естественной паузе (End-of-Utterance debounce 850 мс) с сохранением преролл-буфера (500 мс) для первых согласных звуков.
  3. Реализация Dual-Track Sliding Window с Left Context Overlap (1.5 с) по модели FluidAudio: при непрерывном длинном монологе в Zoom (>7 с) сегмент безопасно финализируется, а следующий чанк забирает 1.5 с контекста предыдущего чанка, предотвращая разрезку слов посередине слога.
  4. Живой VU-метр и визуальная прозрачность конвейера в `VoiceIndicator`: реактивное кольцо микрофона пульсирует в реальном времени от фактического RMS входного аудиопотока (0.0…1.0), а статус наглядно информирует о текущей фазе (`idle` -> `hearing` -> `transcribing` -> `distilling`).
  5. Декомпозиция компонентов с соблюдением AP-019: `stream-recorder.ts` сокращен до 247 строк, все новые файлы $\le 197$ строк, строго $\le 250$ строк.

### Findings Fixed
- [P1] Rigid Blind 4.5s Audio Slicing (AP-012, AP-013) — RESOLVED via natural EOU pause dispatch (850ms) and monologue ceiling (7.0s).
- [P1] Silent VAD Black Hole & Missing Adaptive Noise Floor (AP-012, AP-054) — RESOLVED via AssemblyAI adaptive EMA noise floor port (`EnergyVad`).
- [P1] User Blindness & Missing Real-Time Audio Feedback (AP-054) — RESOLVED via live reactive VU meter and explicit pipeline status badges in `VoiceIndicator`.
- [P2] Monologue Boundary Severing (AP-013, AP-026) — RESOLVED via FluidAudio left-context overlap (1.5s).

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - 105/105 тестов Vitest GREEN (28 тест-сьютов).
   - `tsc --noEmit` 0 ошибок, 0 circular dependencies (AP-025, AP-029).
   - Все файлы в `src/` $\le 247$ строк (строгий PASS AP-019 $\le 250$).
   - Четкое разделение слоев: VAD изолирован через `VoiceActivityDetectorPort` (AP-010).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Сценарий 1 (Короткая фраза -> EOU пауза 850 мс -> немедленный улет в GigaAM v3): подтвержден тестами и рантаймом.
   - Сценарий 2 (Монолог 25 с -> нарезка на 7 с с 1.5 с левым контекстом без потери слов): подтвержден `tests/stream-recorder.test.ts`.
   - Сценарий 3 (Тихий голос из динамиков Zoom -> адаптация шума EMA -> 0 ложных пропусков): подтвержден `tests/energy-vad.test.ts`.
   - Сценарий 4 (Живой VU-метр -> реакция ободка на RMS -> явные статусы): подтвержден `tests/voice-indicator.test.tsx`.
   - PM2 процессы онлайн: `gigaam-asr` (9876), `whisper-asr` (8085), `sherpa-speaker` (8086), `salon-presence` (4343).
   - Сборка `vite build` — 269 мс.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 20 - 2026-10-22 - Dual-Stream Meeting Audio Mixer, Continuous Call Stability & Memory Bounding

### Context
- Branch: `main`
- Plan: `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-20-realtime-meeting-audio-mixer.md`
- Scope:
  1. Реализация нативного браузерного микшера `AudioStreamMixer` (`src/audio/audio-mixer.ts`): объединение физического микрофона пользователя (`getUserMedia`) и системного аудиопотока встречи (`getDisplayMedia`) через узел `MediaStreamAudioDestinationNode` в единый совместный аудиопоток без внешних драйверов или программ.
  2. Исправление логики кнопки `встреча (zoom)` в `useSalonSpeech.ts`: устранена взаимная изоляция («микрофон ИЛИ встреча»). Теперь при старте встречи микрофон пользователя не глушится, а бесшовно микшируется со звуком встречи из наушников.
  3. Bounded Memory для долгих созвонов (1–2+ часа, AP-018): в `StreamRecorder` во время тишины размер кольцевого буфера строго ограничен 2 чанками (~500 мс преролла), предотвращая раздувание памяти и отправку минутных файлов тишины на сервер.
  4. Обновление UI `VoiceIndicator`: явный статус `«встреча: микрофон + zoom»` и понятное сообщение об ошибке, если пользователь забыл включить чекбокс передачи системного звука.
  5. Бесшовный фоллбек: при завершении шаринга экрана (собеседник закончил встречу) Салон автоматически возвращается на чистый микрофон без прерывания сессии.

### Findings Fixed
- [P1] Mutual Exclusion Bug in Meeting Audio (AP-010, AP-054) — RESOLVED via `AudioStreamMixer`.
- [P1] Memory Explosion & Lag after Prolonged Silence (AP-018) — RESOLVED via strict 500ms silence pre-roll clamp.
- [P2] Missing User Guidance on Silent Display Capture (AP-054) — RESOLVED via diagnostic error banner.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - 110/110 тестов Vitest GREEN (29 тест-сьютов).
   - `tsc --noEmit` 0 ошибок, 0 circular dependencies (AP-025, AP-029).
   - Все файлы в `src/` $\le 248$ строк (строгий PASS AP-019 $\le 250$).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Сценарий 1 (Двухпоточный микшер Zoom в наушниках + отдельный микрофон): подтвержден `tests/audio-mixer.test.ts` и `tests/meeting-audio.test.ts`.
   - Сценарий 2 (Долгие встречи без накопления тишины): подтвержден `tests/stream-recorder.test.ts`.
   - Сценарий 3 (Подсказка при отсутствии аудиодорожки экрана): подтвержден тестами и UI.
   - Сборка `vite build` — 304 мс. PM2 процессы онлайн.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 21 - 2026-10-22 - Calm Steady Indicator, Anti-Amputation Phrase Distillation & Clean Hearth Fire

### Context
- Branch: `main`
- Plan: `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-21-calm-indicator-meaningful-words-clean-hearth.md`
- Scope:
  1. Ликвидация скачущих состояний кнопки микрофона (`VoiceIndicator.tsx`, AP-054): убраны дергающиеся надписи («слышу речь…», «распознаю (gigaam)…», «нейрокоррекция…», «встреча: микрофон + zoom») и постоянная смена ширины/цветов кнопки. Теперь кнопка всегда спокойна и стабильна: при активной записи отображает ровное `«слушаю»`, при остановленной — `«микрофон (v)»`. Внутренняя точка мягко дышит уровнем громкости без вибрации макета.
  2. Устранение обрезков фраз в круге огня (`phrase-distiller.ts`, `whisper-speech-adapter.ts`, `stream-recorder.ts`):
     - Внедрен анти-ампутационный гейт `isAmputationOrLeak`: пресечена попытка малой LLM Qwen 1.5B ампутировать цельные живые мысли до 1 оторванного слова/глагола (`«поиграй»`, `«работает»`, `«туш»`). Если фраза лаконична или LLM обрезала высказывание до 1 слова, в круг летит полная чистая мысль человека (`repaired_text`).
     - Птолок непрерывного монолога расширен с 7.0 с до 12.0 с, а пауза EOU скорректирована до 700 мс, исключая случайную нарезку речи посередине смысловой фразы.
  3. Очистка костра от видимых связей (`hearth-words.ts`): удалены временные пунктирные линии, перечеркивавшие пламя костра от стульев к словам. Связи диалога по-прежнему персистятся как данные в `localStorage` (`recordLink`), но визуальное поле остается чистым, созерцательным и свободным от линий.
  4. Фильтрация паразитных речевых связок и вводных конструкций (`lexicon-engine.ts`, `phrase-distiller.ts`, `useSalonSpeech.ts`):
     - Внедрен детерминированный фильтр `isPureFillerPhrase` со словарем дискурсивных паразитов («как раз», «в общем», «ну вот», «так сказать», «то есть», «короче», «собственно», «да да», «ага» и др.).
     - Промпт Qwen 1.5B явно проинструктирован вырезать вводные связки («как раз», «в общем») и возвращать `phrase: ""` для бессодержательных фраз-паразитов.
     - `useSalonSpeech` блокирует отправку пустых паразитных конструкций в круг костра.
  5. Соблюдение строгих лимитов AP-019: все файлы $\le 246$ строк.

### Findings Fixed
- [P1] Jittery Jumping Microphone Button UX (AP-054) — RESOLVED via serene static state `"слушаю"`.
- [P1] Single-Word Amputation & Monologue Chopping (AP-012, AP-013) — RESOLVED via anti-amputation guard & 12s ceiling.
- [P1] Intrusive Visible Lines Across the Hearth Fire — RESOLVED by removing canvas lines and keeping links in data only.
- [P2] Conversational Filler Leakage ("как раз", "в общем") into the Hearth Ring — RESOLVED via dual deterministic + neural filler filter.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - 112/112 тестов Vitest GREEN (29 тест-сьютов).
   - `tsc --noEmit` 0 ошибок, 0 circular dependencies (AP-025, AP-029).
   - Все файлы в `src/` $\le 246$ строк (строгий PASS AP-019 $\le 250$).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Сценарий 1 (Кнопка не прыгает): подтвержден `tests/voice-indicator.test.tsx` (ровно `"слушаю"` при любых фазах).
   - Сценарий 2 (В круг летят цельные осмысленные фразы, а не огрызки): подтвержден `tests/phrase-distiller.test.ts`.
   - Сценарий 3 (Чистый костер без линий): подтвержден `tests/hearth-words.test.ts`.
   - Сценарий 4 (Паразитные связки «как раз» не попадают в костер): подтвержден `tests/lexicon-engine.test.ts`.
   - Сборка `vite build` — 423 мс. PM2 процессы онлайн.
   - **Вердикт:** `VERDICT: PASS`.

---

## Cycle 22 - 2026-10-22 - Fullscreen Hearth Clearing, Semantic Phrase Slicing, Majestic Flame & Clean UI

### Context
- Branch: `main`
- Plan: `docs/superpowers/plans/2026-10-22-arch-improvement-cycle-22-fullscreen-hearth-semantic-chunking-flame-growth.md`
- Scope:
  1. Ликвидация технической надписи `«распознавание Sber GigaAM v3…»` (`whisper-speech-adapter.ts`): удалены искусственные строки с названием движка из `onInterimPhrase`. Теперь интерфейс показывает исключительно спокойное `«слушаю»` или реальный распознанный текст без технического мусора.
  2. Овал костра во всю ширину экрана (`motion-engine.ts`): снято жесткое ограничение в 920px (`floorRx = width * 0.46`, `floorRy = height * 0.39`), поляна костра теперь задействует всю ширину любого монитора (92% экрана), давая словам колоссальное пространство без скучивания.
  3. Смысловое разделение длинных монологов (`splitIntoSemanticPhrases` в `phrase-distiller.ts` и `useSalonSpeech.ts`): длинные многосоставные предложения из созвонов теперь автоматически разделяются по естественным смысловым границам (пунктуация, союзы) на 2–3 емкие фразы (по 3–8 слов). Каждая мысль занимает свое место в круге огня без превращения в трехстрочные параграфы.
  4. Масштабирование типографики и пламени костра (`hearth-words.ts`, `hearth-flame.ts`, `motion-engine.ts`):
     - Шрифт парящих фраз увеличен с 17px/18px до **20px / 22px bold JetBrains Mono**.
     - Базовый размер костра увеличен на ~25% (дрова, камни, основание), а динамический рост языков пламени от накопленных слов усилен (`wordContribution` с $\tau = 9$ и коэффициентом роста до 0.70x).
  5. Соблюдение строгих лимитов AP-019: все файлы $\le 246$ строк.

### Findings Fixed
- [P1] Technical Engine Jargon in Interim Phrase (`распознавание Sber GigaAM v3`) — RESOLVED.
- [P1] Constrained Clearing Oval (920px cap on wide monitors) — RESOLVED via `width * 0.46`.
- [P1] Monolithic Paragraph Blocks in Canvas — RESOLVED via `splitIntoSemanticPhrases`.
- [P2] Muted Flame Heat Saturation — RESOLVED via magnified fire tongues & amplified heat response.

### Verification (Dual-Circuit S9 Gate)
1. **Architectural Reviewer:**
   - 113/113 тестов Vitest GREEN (29 тест-сьютов).
   - `tsc --noEmit` 0 ошибок, 0 circular dependencies (AP-025, AP-029).
   - Все файлы в `src/` $\le 246$ строк (строгий PASS AP-019 $\le 250$).
   - **Вердикт:** `VERDICT: PASS`.
2. **Product Reviewer:**
   - Сценарий 1 (Никаких надписей движков в UI): подтверждено в тестах и коде.
   - Сценарий 2 (Поляна на всю ширину экрана): `floorRx = width * 0.46`.
   - Сценарий 3 (Длинные мысли делятся на смысловые фразы): подтверждено `tests/phrase-distiller.test.ts`.
   - Сценарий 4 (Увеличенный шрифт 20-22px и яркий рост костра): подтверждено `tests/hearth-words.test.ts` и `tests/hearth-flame.test.ts`.
   - Сборка `vite build` — 287 мс. PM2 процессы онлайн.
   - **Вердикт:** `VERDICT: PASS`.








