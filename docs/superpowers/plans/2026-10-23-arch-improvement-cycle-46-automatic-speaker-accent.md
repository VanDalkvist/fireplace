# Automatic Speaker Accent — Cycle 46

> Execute inline, TDD and lead review here. No subthreads.

**Goal / approved request:** Participant dots are not manual controls. Show a transient accent for the owner of an accepted phrase entering/updating the hearth; neutral dots in silence, no retained selection.
**Baseline:** 8ea5b63 clean main; branch fix/automatic-speaker-accent.

## Root cause and context
- SalonExperience canvas onClick flushes speech and manually calls handleSelectSpeaker from hit-testing.
- HearthSeatsLayout.render uses activeSpeakerId as ongoing speech after the five-second tail expires, re-highlighting the last logical owner indefinitely. syncParticipants also re-arms pulse from that pointer. Past spokenCount gives permanently different idle colors.
- useSalonSpeech clears ownership with null as unknown as number; setSpeaker then ensureParticipant can create an id:null phantom. The timer is scheduled only on some successful paths and lacks cleanup.
- Existing actual evidence of a known speaker is accepted ASR/phrase attribution, not the persisted active ID or generic VAD. Do not infer that the last known person is currently speaking from arbitrary room noise.

## Selected findings
- [P2] Manual canvas selection/flush contradicts passive dots. AP-053/AP-054. Fix-now remove page click handler; no changes to speech-owner routing or other controls.
- [P1] Persisted ownership/nullable clear causes stuck or phantom visual selection. AP-013/AP-026/AP-029. Fix-now: explicit nullable setSpeaker clears flags without ensuring participant; no type cast; bounded decay scheduled on recognition and cleaned on phase/unmount. Ignore malformed historical participant IDs only at visual boundary; no destructive storage rewrite.
- [P2] Accent may reappear idle or target a fallback seat. AP-013/AP-054. Fix-now: render only finite phrase-event accent, uniform idle state, refresh on real token update; never pulse a borrowed word origin for missing speaker. Keep text-placement fallback so no text loss.

## Design / bounded scope
- Pure src/canvas/seat-accent.ts computes event strength from lastSpokenAt and explicit now (5s window). Logical activeSpeakerId never supplies strength. At most one current accent: a fresh valid speaker event clears previous accent.
- hearth-seats.ts: no automatic pulse from active pointer; neutral creation, common idle core color; pulseSeat is event-driven only. Renderer uses transient strength; no continuous selected branch. Existing hit-test utility may remain for compatibility but is not wired to interaction.
- motion-engine.ts: new/update accepted token pulses exact owner, never arbitrary first-seat fallback; existing text placement preserved. Heat speech boost derives only from in-flight phrase event, not stale owner.
- domain/session-fsm.ts: setSpeaker accepts number|null, null clears ownership/isSpeaking without new participant.
- useSalonSpeech/useSalonSession callback types accept null; typed decay clears owner/identified speaker, recognition schedules decay even if text is empty/ignored/failed; timer canceled on phase/unmount. No mic/backend/service reset.
- SalonExperience canvas becomes passive, remove click/flush path. No ASR engine, audio/sample, provider or storage-format changes.

Implementation decomposition: hearth-seat-renderer.ts isolates bounded drawing helpers; useSpeakerDecay.ts owns typed timer cleanup. For unmatched historical token owners, a technical word origin at the hearth center carries the original speakerId without creating a participant; this preserves text even when every historical participant ID is malformed, rather than borrowing/accenting the first dot. No persisted records are deleted.

## TDD / verify
- [x] Add RED tests: no manual canvas handler; idle pointer does not accent before/after decay; same neutral idle core regardless history; a phrase accents correct speaker, expires and never returns; new speaker replaces old accent; null clear cannot add a participant; malformed historical id ignored visually; token updates refresh, fallback origin not accented.
- [x] Observe RED against current code, implement selected changes with fresh time-controlled tests. New helper deterministic/no React.
- [x] Integration/browser regression: click actual dot changes no owner/tokens/flush; accepted phrase accents only its owner and updates renew it; wait >5s all neutral despite persisted owner; reload no restored highlight; legacy null ghost invisible. Synthetic fixtures only, isolated Browser Automation, no live mic/user tab.
- [x] Full tests/type/build/diff and <=250-file limits; lead review AP-010/013/018/019/023/026/028/029/053/054 here. Ledger + GBrain, scoped private push and clean main==origin.

## Plan review
This separates visual evidence from attribution pointer without breaking token identity. Uniform idle appearance avoids representing history as selection. Nullable clear fixes the actual ghost source; historical invalid IDs are not deleted from data. Five-second gentle tail is preserved, not perpetual selection. No speculative live diarization guessed from VAD. Ready to execute.
