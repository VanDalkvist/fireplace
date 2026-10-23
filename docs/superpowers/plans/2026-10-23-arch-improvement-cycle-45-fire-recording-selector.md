# Fire Recording Selector — Cycle 45

> Execute inline with TDD; lead review here, no subthreads.

**Approved goal:** User still dislikes the first sample's low opening rumble and explicitly wants several Internet alternatives plus a click-to-swap control. Keep the lower 0.35 peak and 0.6s rise/fade; allow user audition/choice rather than claim subjective suitability.
**Baseline:** 08c270d clean main; feature branch feat/fire-recording-selector.

## Primary sources / asset policy
Three other recorded fires found through Exa; first-party HTML confirms CC0 links and original descriptions. Public high-quality MP3 previews downloaded into thread storage (not mistaken for uncompressed originals):
- 29chaza / Fire_Wood_Crackle_Dry.WAV, recorded with Zoom H5: https://freesound.org/people/29chaza/sounds/418274/ ; https://cdn.freesound.org/previews/418/418274_6182465-hq.mp3
- Vrymaa / Fire - Chimney / Stove, close recording: https://freesound.org/people/Vrymaa/sounds/770108/ ; https://cdn.freesound.org/previews/770/770108_13973196-hq.mp3
- Davor / Fire crackling in fireplace, Zoom H1: https://freesound.org/people/Davor/sounds/382616/ ; https://cdn.freesound.org/previews/382/382616_7094269-hq.mp3
Exclude matucha's no-flame recording: author asks not to redistribute raw files; do not imply it was selected. Retain original AntumDeluge recording as fourth comparison option.
Create three ~3s mono PCM clips, remove sub-bass with 180Hz high-pass, gently remove hiss above 9kHz, align peak level to -10dB without dynamic compression. Record exact trim/filter/source hashes in asset license/provenance. This is source editing, not synthetic generation. No new runtime external dependency.

## Architecture / findings
- [P2] One fixed sample cannot satisfy user listening preference. Fix-now: pure four-entry catalog with explicit default dry recording, runtime typed port selection, local persisted choice and adjacent cycle/preview button.
- [P2] Switching while loading/playing must not emit stale clip or let old rejection clear new cache. Fix-now: per-recording promise cache, generation cancellation; stopping voices fade for 40ms but no longer block a newly selected preview.
- [P2] Session hook is 236 lines. Fix-now: isolate selection state/persistence in useFireRecording hook to preserve <=250 source budgets.
- Out of scope: audio synthesis, automatic fallback, microphone/meeting routing, redesign of technical pult, general audio preferences screen.

## Bounded changes
- src/config/fire-recordings.ts: catalog URLs/labels, explicit default, strict lookup.
- src/audio/sound-effects-port.ts: add selectRecording(id).
- src/audio/natural-fire-adapter.ts: keyed loader/cache and selection, safe voice cancellation, retain current envelope/cooldown/max-active voices.
- src/audio/audio-engine.ts: selection method cancels stale calls; preview only when enabled; selecting while muted never resumes/loads/plays.
- src/composition/audio.ts: validate chosen catalog entry and inject keyed local loader, no concrete adapter in core.
- src/hooks/useFireRecording.ts: validated saved choice, explicit default migration, selection callback and localStorage persistence with observable storage failure.
- src/hooks/useSalonSession.ts: delegate selection hook, supply initial choice to factory; return current option count/label and cycle callback.
- src/components/SalonExperience.tsx + TechnicalGearPult.tsx: compact 'треск: 1/4' cycle button beside existing sound toggle; tooltip/accessibility names show actual recording. On click replace/prelisten if enabled, preserve mute behavior.
- Tests: selection cancels old playback, decode cache, late rejection isolation, muted selection vs preview, strict catalog/default, SSR button and previous regressions.

## Execute / verify
- [x] Prepare licensed assets and metadata; verify exact duration/format/peak and hashes.
- [x] Add selection regressions, observe RED before implementation; implement keyed cache/port/engine and verify GREEN.
- [x] Add catalog, selection hook and UI; keep all touched files <=250, strict TS. No new package.
- [x] Isolated Browser Automation: four bundled clips decode/distinct data, real next button switches live buffer, preview replaces rather than queues, selecting muted is silent, selection persists reload; no external runtime sound fetch or mic.
- [x] Full test/type/build/diff checks, lead review AP-010/018/019/020/022/023/027/028/029/053/054 here. Ledger/GBrain, scoped commit and private push, clean main==origin.

## Plan review
User specified comparison by click, so no additional preference questions needed. Catalog describes sources, not subjective 'no rumble' promises. Low frequencies are filtered in new derivative assets, old sample remains clearly named. Selector is independent of capture and never bypasses sound mute. Ready to execute.
