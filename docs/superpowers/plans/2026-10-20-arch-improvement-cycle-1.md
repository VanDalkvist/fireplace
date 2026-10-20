# Superpowers Plan: Salon Design System & Screen 05 (Cycle 1)

Date: 2026-10-20
Project: `salon-presence`
Architecture Context Map: `docs/arch-improvement/review-log.md`

## Goal
Построить модульную компонентную дизайн-систему Салона присутствия (S1) на базе оригинальных ассетов AI Mindset (`vendor/aim-upstream/`), Tailwind v4 и shadcn/ui, и реализовать на ней эталонный экран «05 · чувства и желания» с голосовым режимом, селективным связыванием реплик участников и строгим соблюдением AP-правил (`arch-rules.md`).

## Findings in Scope (fix-now)
- `[P1]` Монолитность и склеенность в upstream (640 строк) -> декомпозиция на микромодули строго <= 250 строк (AP-019).
- `[P1]` Отсутствие компонентной дизайн-системы -> сборка токенов S1 и библиотеки `@salon/ui` на базе shadcn/ui.
- `[P1]` Ручной ввод реплик в основном UX -> реализация голосового слушания (`VoiceListening` слот) и визуальной эстафеты.
- `[P2]` Хаотичное связывание слов «все со всеми» -> селективный алгоритм связей реплик (`linking-graph`).

## Out of Scope (log-only / blocked)
- `[P3]` Покадровый MP4 Playwright-рендерер (log-only).
- `[P3]` Светлая бумажная тема `data-theme="paper"` (log-only, фокус на ночном каноне `#050505`).

---

## Tasks & Fix Slices

### Slice 1: Setup & Design Tokens S1 Bridge
- [ ] Task 1.1: Инициализировать конфигурацию проекта (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`).
  - Validation: `npm install` проходит без конфликтов версий.
- [ ] Task 1.2: Создать `src/design-system/tokens.css` с маппингом канонических токенов S1 (`--background: #050505`, `--foreground: #ece4d6`, `--primary: #ffb266`, `--destructive: #d92027`, `--radius: 2px`, `JetBrains Mono`).
  - Validation: компиляция стилей Tailwind v4 через `@theme`.

### Slice 2: Domain Engine & TDD Tests (AP-019 <= 200 строк/файл)
- [ ] Task 2.1: Создать DTO контракты в `src/domain/types.ts` (`Participant`, `FeelingToken`, `DesireToken`, `SessionPhase`, `ConnectionEdge`).
  - Validation: строгая компиляция TypeScript.
- [ ] Task 2.2: TDD для FSM сессии в `src/domain/session-fsm.ts`.
  - Step 1 (Red): Написать `tests/session-fsm.test.ts` (переходы 4 фаз, смена спикера, пас, завершение). Ожидаемый фейл: модуль не реализован.
  - Step 2 (Green): Реализовать чистый FSM (`<= 120 строк`).
  - Step 3 (Verify): `npx vitest run tests/session-fsm.test.ts` -> PASS.
- [ ] Task 2.3: TDD для селективного графа связей в `src/domain/linking-graph.ts`.
  - Step 1 (Red): Написать `tests/linking-graph.test.ts` (проверка, что реплика нового спикера связывается с предыдущей репликой и резонансными узлами, избегая связывания «все со всеми»). Ожидаемый фейл: функции нет.
  - Step 2 (Green): Реализовать алгоритм связывания (`<= 140 строк`).
  - Step 3 (Verify): `npx vitest run tests/linking-graph.test.ts` -> PASS.
- [ ] Task 2.4: TDD для лексикона в `src/domain/lexicon-engine.ts`.
  - Step 1 (Red): Написать `tests/lexicon-engine.test.ts` (поиск эмоций, модификаторов, маркеров желаний и паса).
  - Step 2 (Green): Реализовать чистые функции словаря (`<= 150 строк`).
  - Step 3 (Verify): `npx vitest run tests/lexicon-engine.test.ts` -> PASS.
- [ ] Task 2.5: Реализовать аудио-генератор в `src/audio/audio-engine.ts` (Ре дорийский дрон, колокольчики, обертоны на Web Audio API, `<= 220 строк`).
  - Validation: юнит-проверка инициализации AudioContext и частотных таблиц.

### Slice 3: Salon UI Component Library (shadcn/ui + S1)
- [ ] Task 3.1: Создать базовые UI-примитивы в `src/components/ui/` (`button.tsx`, `slider.tsx`, `sheet.tsx`, `dialog.tsx`).
  - Validation: соответствие токенам S1, радиусы 2px, строчный регистр.
- [ ] Task 3.2: Создать `src/components/salon/SalonHeader.tsx` (AIM логотип, степпер 01..04, индикатор голоса, статус сессии, `<= 120 строк`).
- [ ] Task 3.3: Создать `src/components/salon/SeatCircle.tsx` (круг 12 мест с подсветкой активного голоса, риской ведущего и меткой паса, `<= 150 строк`).
- [ ] Task 3.4: Создать `src/components/salon/SalonPult.tsx` (выезжающая шторка Sheet: звук, чувствительность, выбор движка, демо-кнопка, `<= 180 строк`).
- [ ] Task 3.5: Создать `src/components/salon/IntroDialog.tsx` (правила круга, проверка звука, кнопка входа, `<= 130 строк`).

### Slice 4: Canvas Motion Engine & Layer Integration
- [ ] Task 4.1: Реализовать `src/canvas/motion-engine.ts` (детерминированный рендерер Prompt Motion, физика всплытия и дыхания облака, `<= 220 строк`).
- [ ] Task 4.2: Реализовать `src/canvas/graph-renderer.ts` (отрисовка дуг и световых нитей присутствия между связанными репликами, `<= 150 строк`).
- [ ] Task 4.3: Собрать `src/components/SalonExperience.tsx` (композиция Canvas Stage на z-0 и DOM Overlay на z-10 с `pointer-events-none`).
  - Validation: отсутствие блокировки кликов по кнопкам и корректный рендер в браузере.

### Slice 5: Verification & Dual Circuit Gate (S9)
- [ ] Task 5.1: Настроить авто-демо режим (`?demo=1`) с симуляцией диалога круга за 4 минуты.
- [ ] Task 5.2: Архитектурный гейт (`arch-rules-implementation-review`):
  - Проверка лимитов строк: `wc -l` по всем файлам `src/**/*.ts*` (все строго <= 250 строк, AP-019).
  - Проверка чистоты зависимостей и отсутствия циклических импортов (AP-025).
  - Запуск полного сьюта тестов Vitest (100% зеленые).
- [ ] Task 5.3: Продуктовый гейт (`arch-improvement-product-review`):
  - Проверка сценария: голос участника -> появление в облаке -> передача следующему -> прорисовка селективной связи.
  - Проверка хоткеев: `Tab` (пульт), `Space` (пауза), `1..4` (фазы), `Esc` (закрытие диалогов).
- [ ] Task 5.4: Обновление леджера (`docs/arch-improvement/review-log.md`) и запись устойчивых уроков в GBrain (S10-S11).
