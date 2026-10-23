# Natural Fire Response — Cycle 44 Implementation Plan

> Execute inline with executing-plans/TDD; lead architecture/product review here. No subthreads.

**Goal:** Replace the unused musical tones/bell with a natural short log-fire crackle after accepted utterances, then silence. Existing sound toggle, volume, session triggers, meeting capture/mixing remain.

## Approved design and context
User explicitly approved the prior proposal (wood settles → irregular crackles → dies away), chose a natural short recording and asked to implement it. Baseline 7f4b7d4, clean main; feature branch feat/natural-fire-audio. Existing audio-engine owns AudioContext/master/duck and meeting capture; do not conflate replacing FX with replacing capture.
Primary sources verified this run: OpenGameArt Fire Crackling by AntumDeluge explicitly CC0; downloaded original fire-1.wav is 253232 bytes, mono PCM16 44100Hz, 2.870612s, SHA256 26702de8a195bcbafeae72034861d875a1b7917168a25106f4e1957ecdddf7e5. Source URL https://opengameart.org/sites/default/files/fire-1.wav . Publication https://opengameart.org/content/fire-crackling . No synthetic audio generation or remote runtime sound dependency.
MDN AudioBufferSourceNode.start: offset/duration are source seconds and must account for playbackRate when scheduling envelope/stop. decodeAudioData decodes complete files and resamples for context.

## Architecture context / selected findings
- [P2] Evidence: playFeeling/playDesire use oscillators/musical intervals. Impact: wrong approved experience. Rule: AP-018/AP-054. Fix-now: typed sound-effects port, natural sample adapter; preserve public engine callbacks.
- [P2] Multiple phrases can dispatch in one utterance. Impact: layering every fragment would overwhelm speech. Rule: AP-013/AP-054. Fix-now: explicit 0.75s coalescing window and max two active short voices in adapter, no event queue backlog.
- [P2] Async asset loading can finish after mute. Impact: stale late audio. Rule: AP-023. Fix-now: generation guard on pending playback, fast fade+stop on mute/pass, cleanup on end.
- [P2] Loading/resume failures cannot silently revert to old musical sound. Rule: AP-022/AP-023. Fix-now: typed/wrapped load error, explicit error UI, disable failed audio; retry only on new user toggle.
- Log-only: old numeric music constants retained as compatibility exports, general capture cleanup, standalone general-purpose audio registry, redesign of speech gating and global theme.

## User listening correction (during implementation)
User heard the first version and reported sudden onset / excessive level. Updated approved envelope: gain peak <=0.35 instead of 0.65, gradual 0.6s rise from zero, then fade to silence within the existing <=3s voice. Remove the old 20ms attack and early fixed-gain step. Add regression RED/GREEN and repeat real PCM rendering/UI checks. This supersedes the initial envelope parameters, not the chosen sample or toggle mechanics.

## Files and contracts
- New src/audio/sound-effects-port.ts: prepare(context):Promise<void>, play(context,output):Promise<void>, stop():void. Technical audio port; no React or domain dependency.
- New src/audio/natural-fire-adapter.ts: injected sample loader/random, cache one decoded buffer, three nonidentical starting offsets, rate 0.98–1.02, no loop, <=3 seconds, gently filtered/enveloped playback, cooldown/polyphony, cancellation and node cleanup. <=250 lines, methods <=40.
- New src/audio/load-audio-sample.ts: bounded local fetch (5s), decode, nonzero finite duration validation, original cause retained; no fallback.
- New src/composition/audio.ts: wire sole configured natural adapter + asset URL into SalonAudioEngine.
- New src/assets/audio/fire-crackling.wav and LICENSE.fire-crackling.txt: unmodified verified CC0 original + creator/source/license/hash metadata.
- Modify src/audio/audio-engine.ts: constructor receives effects port and error observer; preserve master/duck/volume and meeting methods; musical methods delegate to effect. Explicit handling of resume/prepare/play failure and generation-safe mute.
- Modify src/hooks/useSalonSession.ts and src/components/SalonExperience.tsx: composition wiring; failed audio shown through existing error UI, cleared on explicit retry. No new auto-play on enable alone.
- Update relevant sound tooltips to describe natural phrase-triggered crackling rather than procedural ambience.
- Tests: new natural-fire-adapter/audio-engine-effects/load-audio-sample contracts; existing meeting-audio tests inject port without enabling FX.

## Slice 1: asset, port and adapter
- [x] Write failing tests for source-based bounded nonlooping playback, once-only loading, cue nonrepeat, envelope/rate timing, simultaneous-call coalescing/max2, mute-during-load cancellation, stop/ended cleanup, explicit load failure and retry.
- [x] Observe RED, implement minimal port/loader/adapter, verify targeted GREEN.
- [x] Copy original verified file into project unchanged and ship provenance/license; file/hash/ffprobe checks (non-code validation).

## Slice 2: composition and engine
- [x] RED engine tests: default silent, on-toggle prepare/resume, no sound until utterance, both old callbacks use injected port, mute/pass stop, volume preserved, no oscillator, stale failures ignored after mute, actual failure disables/reports.
- [x] Wire factory and session error UI, retain meeting methods/tests, adjust natural-sound labels.
- [x] Targeted tests + full unit/type/build gates.

## Slice 3: product/runtime
- [x] Isolated Browser Automation only, no microphone/shared reset. Real asset fetch/decode and OfflineAudioContext render: nonzero PCM, bounded duration, fading tail, no clipping, no loop; save actual output for user's audition. Technical rendering is not a claim of human listening.
- [x] Exercise UI sound off/on, no autoplay on enable, accepted demo utterance creates buffer source (not oscillator), rapid events bounded, mute stops, volume lowers samples, failed asset explicit UI/no musical fallback and retry, book/copy controls retained.
- [x] Full test/type/build/diff/line checks, lead review AP-010/018/019/020/022/023/026/028/029/053/054 here; record bounded residual acoustic mic feedback risk (not live-tested).
- [x] Ledger and GBrain writeback; scoped commit, fast-forward main, private push, verify clean HEAD==origin/main. Offer audition file, do not claim listening verification without it.

## Plan review
All behavior is bounded to FX path. Shared AudioContext/capture untouched, no new dependency/service. Missing asset is visible failure, not silent invented synthesis. No fetch before explicit sound enable. Only local bundled recording; preserve loudness control and cancel stale pending events. Ready to execute.
