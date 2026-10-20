# Arch Improvement Review Log: salon-presence

## Cycle 1 - 2026-10-20 - Salon Design System & Screen 05 (Feelings & Voices)

### Context
- Branch: `main`
- Scope: Создание компонентной дизайн-системы Салона присутствия (S1) на базе shadcn/ui + Tailwind v4 из оригинальных ассетов AIM, реализация эталонного голосового экрана «05 · чувства» с селективным связыванием реплик участников.
- Source docs:
  - `upstream/app.js`, `upstream/lexicon.json`, `upstream/music.js`
  - `vendor/aim-upstream/*` (ассеты `aim-mini-apps.css`, `aim-app-shell.css`, `site-shell.css`, `04-mandala/style.css`)
  - `~/Projects/arch-rules/arch-rules.md`
- Architecture gates: AP-010, AP-011, AP-019 (лимит 250 строк/файл), AP-020, AP-021, AP-026, AP-028 (TDD детерминизм), AP-029 (TypeScript strictness).
- Memory entries used:
  - Моушен-исследование Prompt Motion (`prompt-motion-lab/docs/RESEARCH.md`).
  - Тонкие границы Ports & Adapters, разделение Canvas-слоя и DOM-оверлея.

### Findings
- [P1] Монолитность и дублирование в upstream (640 строк в app.js) - fix-now
  - Evidence: `upstream/app.js` содержит 640 строк, где склеены лексикон, Web Audio, DOM и Canvas.
  - Impact: Нарушает AP-019 (hard limit 250 строк), блокирует масштабирование и компонентное переиспользование.
  - Rule: AP-019, AP-010.
- [P1] Отсутствие строгой дизайн-системы (ad-hoc CSS со специфичностью `#mandala-root`) - fix-now
  - Evidence: `vendor/aim-upstream/style.css` и `site-shell.css` содержат разрозненные глобальные селекторы без компонентной инкапсуляции.
  - Impact: Невозможно строить новые экраны без ломки глобальных стилей.
  - Rule: AP-014, AP-020.
- [P1] Ручной ввод в основном UX-потоке вместо голосового слушания - fix-now
  - Evidence: В старом прототипе ведущий вручную печатает фразы участников.
  - Impact: Отвлекает от практики присутствия, требует операторской рутины.
  - Rule: Product Contract / UX.
- [P2] Отсутствие селективного графа связей реплик участников - fix-now
  - Evidence: В старом прототипе дуги тянутся хаотично между всеми словами.
  - Impact: Визуальная каша при >5 участниках, нарушается драматургия подхвата реплик по кругу.
  - Rule: AP-011, Product Acceptance.
- [P3] Экспорт видео покадрово в MP4 (Playwright рендер) - log-only
  - Reason: В первой итерации фокус на живом рантайме в браузере.
- [P3] Светлая бумажная тема (`data-theme="paper"`) - log-only
  - Reason: Приоритет отдан базовой ночной теме Салона (`#050505`).

### Decisions & Slices
- Slice 1: Сборка дизайн-токенов S1 из upstream в Tailwind v4 + shadcn/ui.
- Slice 2: Доменные модули ядра (TDD): `session-fsm`, `linking-graph`, `lexicon-engine`, `audio-engine` (все <= 200 строк).
- Slice 3: Салонные UI-компоненты (`SalonHeader`, `SeatBar`, `SalonPultSheet`, `VoiceIndicator`, `IntroDialog`).
- Slice 4: Canvas-движок связывания реплик (Prompt Motion) + интеграция слоев.
- Slice 5: Демо-симуляция и сквозная верификация (Dual Circuit).
