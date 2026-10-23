# Copy Circle Rules — Cycle 43 Implementation Plan

> Execute inline with executing-plans/TDD; lead review here, no subthreads.

**Goal:** Separate icon-only Copy button beside the book copies the complete introduction and numbered agreements with the popup closed.
**Approved scope:** Latest explicit user request extends the existing rules widget; no additional design choice required. Keep the popup control independent. Plain text with original capitalization/punctuation, numbering 1–8 and blank paragraphs.
**Architecture:** Canonical static content supplies both rendering and copied text. A tiny injected Clipboard writer boundary propagates native rejection/unavailability. Local button state awaits success before showing Check/status, visibly reports failure, disables while pending, and cleans success-reset timer. Existing book, audio, speech and session behavior unchanged.
**Baseline:** 9de6910, clean main; feature branch feat/copy-circle-rules. Context: prior rules component and global shortcuts require key-event scoping; existing theme colors use explicit CSS variables.

## Selected findings
- [P2] Evidence: rules currently exist only inside popup markup. Impact: no direct copy action and naive second copy would drift. Rule: AP-018/AP-054. Fix decision: canonical shared content + separate copy action.
- [P2] Evidence: current AnalyticsModal clipboard calls are unawaited. Impact: copying that pattern could falsely claim success after denial. Rule: AP-022/AP-023. Fix decision: await/visible errors in new feature only; analytics refactor log-only.

## Files
- New src/content/circle-rules.ts: introduction, lead/body items and derived numbered text, one canonical export.
- Modify src/components/salon/CircleRulesContent.tsx: render shared data, preserve exact output.
- New src/infrastructure/browser-clipboard.ts: writeClipboardText(text, injected clipboard), reject unsupported/denied; no legacy fallback.
- New src/components/salon/CopyCircleRulesButton.tsx: accessible copy icon, pending/success/error states and scoped keyboard interaction.
- Modify src/components/SalonExperience.tsx: mount independent sibling after book, outside Dialog trigger.
- Modify tests/circle-rules.test.tsx: exact copied text, numbered paragraphs, sibling placement and accessible closed control, clipboard success/denied/unavailable contracts.

## Execution
- [x] Add failing tests; run npx vitest run tests/circle-rules.test.tsx and observe missing-feature RED, then assertion RED with empty stubs.
- [x] Extract original text without rewriting. CIRCLE_RULES.text derives introduction and items joined with double newlines and explicit numbers. Refactor display to use the same data.
- [x] Implement clipboard boundary and button: await writeText; show success only after resolve; preserve native failure cause, safe diagnostic and visible localized status; retry permitted. No fake copy or hidden API fallback. Reset success timer with cleanup.
- [x] Mount sibling after book. Run targeted tests and typecheck.
- [x] Browser Automation isolated session: real clipboard write/read after explicit user gesture with permission, exact payload comparison; popup stays closed. Simulate pending/rejection/unsupported to check no false success and successful retry; Space must copy without triggering session. Check desktop/narrow layout and existing book open/close.
- [x] Full npm test/typecheck/build/diff/line budgets. Lead architecture review AP-010/018/019/020/022/023/028/029/053/054. No independent review claim.
- [x] Ledger and GBrain writeback; commit scoped files, fast-forward main, push private origin, verify clean HEAD==origin/main.

## Plan review
Small bounded UI extension. No new package, permissions auto-grant in application, browser user profile, recording, audio or persisted settings. Browser clipboard testing is isolated and does not read the user's clipboard. Ready to execute.
