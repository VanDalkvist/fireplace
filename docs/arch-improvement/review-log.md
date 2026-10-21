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

