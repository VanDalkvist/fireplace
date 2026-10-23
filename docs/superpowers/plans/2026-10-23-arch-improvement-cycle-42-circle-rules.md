# Circle Rules — Cycle 42 Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans and test-driven-development. Review by lead in this thread; do not spawn subthreads.

**Goal:** Book-only button beside the gear opens an upper-right panel with the user's exact introduction and eight agreements.

**Architecture:** Local presentation-only React components. Existing Radix Dialog dependency provides nonmodal dismissal, focus restoration and keyboard behavior; custom anchored content avoids the existing center-screen modal and backdrop. Static content is separate from behavior. Canvas, domain, speech, audio, network and persistence are unchanged.

**Tech Stack:** React 19, existing Radix Dialog and shadcn UI exports, Tailwind theme, lucide BookOpen/X, Vitest SSR and isolated Browser Automation.

## Approval and context
- User approved the previously proposed corner panel and specified book icon without text beside the gear; latest instruction: finish the button before sound research.
- Baseline 529c28a, clean main. Work on feature branch, fast-forward main after verification.
- Current header in src/components/SalonExperience.tsx has pointer-events-none; controls must opt back in. Existing gear stays unmodified.
- Theme uses mono type, dark translucent surfaces and warm primary. Body globally lowercases text: panel must override with normal-case to preserve supplied wording/case. Text selection enabled inside the panel.
- Rules content is supplied UI copy, not a policy that silently changes microphone or LLM behavior. Do not imply that opening the rules grants recording consent.

## Findings / triage
- [P2] Evidence: header has no rules control. Impact: supplied agreements cannot be opened during a circle. Rule: AP-054. Fix decision: fix-now.
- [P2] Evidence: global body text-transform:lowercase and select-none page. Impact: supplied wording/case or copying could be impaired. Rule: AP-054. Fix decision: fix-now within new panel only.
- [P2] Browser RED: global Tab/Space shortcuts intercept focus navigation in the new rules widget (Tab opens old pult; Space triggers a turn). Fix-now: stop key event propagation at the book/content boundaries, without changing existing global shortcuts outside this widget. Browser acceptance protects keyboard activation and scroll.
- [P2] Browser RED: semantic bg-card/95 compiled to no CSS because existing theme variables lack Tailwind @theme mapping; computed panel background was transparent. Fix-now: explicit CSS-variable arbitrary utilities only in the new widget, no global theme repair. Verify computed background and mobile readability.
- Audio replacement/research: log-only, explicitly postponed until this feature is finished. IntroDialog's older wording is outside this requested addition; do not rewrite it.

## Files
- Create src/components/salon/CircleRulesContent.tsx — exact structured content, no Markdown parser.
- Create src/components/salon/CircleRules.tsx — book trigger, anchored nonmodal accessible panel.
- Create src/components/salon/circle-rules.css — scoped reveal keyframes (reduced-motion respected), no global theme changes.
- Modify src/components/SalonExperience.tsx — wrap right controls in a flex row and mount the new control next to existing gear.
- Create tests/circle-rules.test.tsx — exact wording, eight numbered items, emphasized leads, icon-only accessible closed trigger.
- Append docs/arch-improvement/review-log.md with truthful evidence and scoped review.

## Task 1: RED → GREEN content and control
- [x] Add SSR tests for exact intro/eight paragraphs, strong lead phrases, no rewrite/truncation, icon-only button with accessible Russian name, closed by default.
- [x] Run npx vitest run tests/circle-rules.test.tsx; observe missing-feature RED.
- [x] Implement pure CircleRulesContent with <p>, <ol>, eight <li> and <strong>; every supplied character retained (Markdown formatting becomes semantic markup).
- [x] Implement CircleRules using existing Dialog/Portal/Title/Close and Radix nonmodal Content/Trigger: icon-only BookOpen, title/accessible name, no backdrop, top-right anchored responsive width, max-height with internal scrolling, semantic heading and close control. Built-in Escape/outside dismissal and trigger focus restoration.
- [x] Mount <CircleRules /> immediately beside <TechnicalGearPult /> in a pointer-events-auto row. Leave the existing technical panel callbacks and behavior unchanged.
- [x] Run targeted tests and typecheck; expect PASS.

## Task 2: Verify and review
- [x] Run npm test, npm run typecheck, npm run build, git diff --check and touched-file line counts <=250.
- [x] Open isolated Browser Automation. Assert book-only initial control, actual adjacency with gear, exact text and eight numbered rules after click, no overlay, no body overflow, last rule reachable by internal scroll. Check desktop and narrow viewport.
- [x] Check close button, trigger toggle, Escape, outside click, keyboard activation/focus return, open technical pult compatibility. Never start microphone/reset shared services.
- [x] Review HERE against AP-010/AP-020 (no layer leak), AP-018/AP-019 (small responsibility modules), AP-028/AP-029 (deterministic tests/strict TS), AP-053/AP-054/AP-064 (local state, accessibility, existing UI stack). Record actual passed checks and residual risk, not an independent review claim.
- [x] Append ledger; record durable project change through GBrain. Commit scoped files, fast-forward main, push private remote, verify HEAD==origin/main and clean worktree. Sound work starts only after button completion.

## Plan review
Scope matches the latest explicit instruction, no dependency/network/audio changes, no missing callbacks or new global state. Radix handles cleanup/focus rather than introducing bespoke global listeners. Responsive panel scroll and capitalization are explicit acceptance checks. Ready to execute inline.
