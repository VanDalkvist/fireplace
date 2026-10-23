# Larger Hearth / Readable Phrases — Cycle 47

> Execute inline with TDD and lead review here; no subthreads.

**Approved request:** User confirms selection worked, asks larger starting fire without losing growth and larger default phrase text. Do not touch chosen audio/preferences.
**Baseline:** 7f1034a, clean main; branch feat/larger-hearth-readable-phrases.

## Architecture context / defaults
- Increase hearth presentation uniformly 1.2× around its existing center; leave heat accumulation, flare events, hot/cold growth formula and stone/flame internal ratios unchanged. Scale particles with the hearth, not separately.
- Phrase type: 24px resting / 25px warm semibold, 30px line step (was 20/21/24). Shared presentation constants drive measuring, rendering and block heights. Preserve <=5 lines/block, <=640px line width and full overflow text.
- Existing useSalonCanvas multiplies backing dimensions by DPR but paints unscaled pixel fonts, effectively making 20px text 10 CSS px at DPR2. Correct the boundary: high-resolution backing store, setTransform(DPR), logical CSS viewport dimensions passed to engine. Same configured visual sizes at DPR1/2; no hit-test conversion since canvas is now passive.
- Shared keep-out bounds cover enlarged maximum visible flame: half-width192, top400 (195*1.7*1.2≈398), below90. Width budget accounts for these margins. Dense arbitrary/mobile content remains finite-space limitation; never truncate/drop text.

## Findings / decisions
- [P2] Small cold fire/phrase fonts, DPI shrink, mismatched independent layout literals. Impact: poor default legibility; larger text may overlap the bigger fire if only font is changed. Rule: AP-018/AP-054/AP-055. Fix-now shared presentation, scaling wrapper, CSS-coordinate boundary and matched keep-out.
- Exclude: changing the chosen sound/voice, speech/provider/domain logic, passive-dot behavior, heat curve redesign, general responsive HUD rewrite or truncation/eviction.

## Added explicit user scope: persist sound settings
User additionally requires recording choice AND sound toggle to survive reload. Existing useFireRecording already persists/validates choice; retain it. Extract audio toggle/error/engine wiring into useSalonAudio to stay below 250 lines, restore its saved boolean and persist changes. No microphone/listening state restoration. Browser autoplay policy is respected: saved on is restored, pending suspended AudioContext resumes on first pointer/key gesture via resumeIfEnabled (without toggling/off/on or playing an unsolicited sample). No continuous sound on reload. Record localStorage failure diagnostics safely. Tests cover initial saved state, restore without click, first-gesture unlock, explicit off and second reload with recording unchanged.

## Files
- New src/canvas/hearth-presentation.ts: shared immutable metrics only.
- New src/canvas/render-scaled-hearth.ts: bounded save/centered transform/render/restore wrapper.
- New src/canvas/canvas-viewport.ts: backing-store resize + CSS-coordinate DPR transform.
- Modify useSalonCanvas.ts to use logical dimensions, preserve RAF cleanup.
- Modify motion-engine.ts to call centered scaled hearth wrapper, unchanged heat values/events.
- Modify hearth-word-renderer.ts/hearth-words.ts/hearth-word-layout.ts to share fonts, line heights, width margins and scaled fire bounds.
- New src/hooks/useSalonAudio.ts, audio-engine.ts resumeIfEnabled and session delegation for persisted boolean; existing recording persistence remains unchanged.
- New tests/hearth-presentation.test.ts plus audio resume/restore contracts; retain lossless/heat/geometry contracts.

## Execute / verify
- [x] RED tests for larger measured/rendered text, 30px multiline spacing/block heights, centered 1.2× transform forwarding unchanged heat, correct DPR2 backing vs logical dimensions and render transform, fire clearance.
- [x] Implement bounded modules/changes; targeted GREEN, full unit/type/build/diff and <=250-file checks.
- [x] Isolated Browser Automation DPR1/DPR2: default font readable in CSS px, centered larger cold fire, hot fire still expands, same-size world across DPR; complete long phrases (no ellipsis) reflow/reload and remain outside enlarged fire. Verify saved sound ID unchanged. No mic/shared reset.
- [x] Review AP-010/018/019/026/028/029/053/054/055 here; ledger/GBrain, scoped commit/private push and clean main==origin.

## Plan review
Size changes are explicit, not higher initial heat or an earlier saturation curve. Rendering and collision geometry remain coordinated. DPI coordinate correction is required for predictable reading size, with word-cache reflow on first resize. No audio settings are rewritten or preference guessed from 'I chose'. Ready to execute.
