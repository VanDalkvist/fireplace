# UI accessibility migration

Baseline `2b9616ed589c4181aeaeb7fd6f7326bc205c8039`. Working branch `ui-migration-dev`. Source and existing tests are public. Production release remains out of scope.

## Cycle 54 · native keyboard navigation (S0–S7)

Product job: operate the campfire, select phases, open session controls and interact with dialogs without accidental turn advancement or losing keyboard focus. Preserve the authored canvas, spoken-word behavior, phase machine, audio and existing demo.

Architecture map: `src/main.tsx → App → SalonExperience`; UI state and callbacks in hooks, typed session domain, canvas independent. `useSalonHotkeys` is the global keyboard boundary; `SalonModals → SalonPult → Sheet` owns session controls. Local memory records the earlier minimal HUD and stable phase cue. No new dependency or domain change.

Findings / fix-now:
- [P1] D08/C04: `src/hooks/useSalonHotkeys.ts` global Tab prevents native focus traversal and toggles the pult. Space and arrow keys also intercept native controls. `SalonPult.tsx` documents Tab; no dedicated visible pult trigger exists. Preserve native keyboard operation and expose a compact existing-shell control for the session pult.
- [P2] D08/D09: `SalonExperience.tsx` hides HUD with opacity and transforms while descendant actions remain keyboard focusable. Make hidden HUD inert; keep keyboard zen exit.
- [P1] C07/F07: `SalonExperience.tsx` mic button calls guarded `handleToggleListening`, but global speech shortcut and `SalonModals` call speech engine directly. Route these entrypoints through the same guard. No new audio behavior or external action.

S3 scope: existing UI migration and accessibility/behavior preservation. Bounded correction to established controls, no new visual system or scene design. Native Tab always retains its browser function; session pult remains available through a visible button. Further redesign requires its own design gate.

Plan:
- [ ] Native Tab untouched; global shortcuts ignore modifiers/composition/editable and focused interactive controls. Preserve physical N on scene, no repeat.
- [ ] Visible session-pult button, accessible Sheet title, focus return on close, help text reflecting native Tab.
- [ ] Inert top/bottom HUD in zen; no canvas/session changes.
- [ ] Route all mic controls through existing guarded callback.
- [ ] Behavioral tests for Tab/Shift+Tab, Space/Arrow on focused controls, existing scene shortcuts, and source wiring. Run existing types, tests, build; verify actual browser focus/pointer and demo after build.

S7 self-review: change confined to UI orchestration; preserve primary canvas/phase semantics and existing button callbacks. No provider calls in test. Browser and independent S9 still pending.

## S8 · implementation checkpoint
- Native Tab traversal is no longer intercepted. Focused native controls and dialog-local input own their keyboard events. Scene shortcuts remain on the global boundary, with modifier/repeat/composition guards.
- Existing session sheet has a visible trigger and accessible title, close focus return; hidden HUD uses inert; speech keyboard and session-sheet controls call the same existing guard as the microphone button.
- Added behavioral shortcut tests; execution, typecheck, build, actual browser focus/zen/demo verification and independent reviews pending. No product completion claim.

- Post-implementation source check: extract the session pult trigger as a focused UI component to retain the 250-line SalonExperience boundary; no domain behavior moved. Pending actual verification.

## Verification checkpoint
- Code revision `803f6def0b49ee3c7f03086716662ae261fcaf78`. S8 implemented, S9 pending. Source readback confirms global Tab bypass, two inert HUD containers, accessible dialog title, return-focus call and shared guarded speech callback; SalonExperience remains within 250 lines. Added behavioral tests for scene/native keyboard separation. Source evidence only.
- Existing baseline tests succeeded before the changes. Current code typecheck/test/build and rendered browser evidence pending. No production release.
- Remaining: independent architecture/product review, actual keyboard navigation, dialog focus return, zen and demo flow in compiled app at narrow/wide widths; verify UI semantic checks and keyboard-shortcut opt-out in subsequent design slice. No provider calls or real recordings used. Next: verify exact working-branch build and address findings. All P1/P2 findings remain verification-pending.
