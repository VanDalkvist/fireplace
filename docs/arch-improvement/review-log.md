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
