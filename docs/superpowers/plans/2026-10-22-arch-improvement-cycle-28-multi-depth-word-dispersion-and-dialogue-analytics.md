# Architecture Improvement Plan - Cycle 28: Multi-Depth Word Dispersion & Dialogue Analytics

## Goal
1. Break words out of the single congested radial ring around the campfire into an organic, multi-depth radial distribution ($R \in [0.45, 0.88]$) with widened collision padding, dispersing phrases across the wide meadow.
2. Verify and solidify dialogue handoff data collection (who spoke after whom, what was said, timestamps, speaker seats), and provide a dedicated `SessionAnalytics` aggregator for post-circle review.

## Architecture Context Map
- `src/canvas/hearth-words.ts`: Slot finding, radial tiers ($R \in [0.45, 0.88]$), and `recordLink` handoffs.
- `src/domain/session-analytics.ts` (NEW): Aggregates dialogue flow (`fromSeat -> toSeat`), turn transitions, speaker metrics, and emotional trajectory.
- `tests/hearth-words.test.ts`: Verifies multi-depth radial dispersion across diverse radii.
- `tests/session-analytics.test.ts` (NEW): Verifies dialogue flow aggregation, speaker turns, and handoff tracking.

## Findings Selected for `fix-now`
- **[P1] Single-Radius Word Congestion**: Words all clustered around `baseR = 0.66` with minimal variance ($\pm 0.08$), leaving the inner and outer clearing underutilized while creating dense rings.
- **[P1] Verifiable Post-Circle Dialogue Analytics**: Need verified data structures capturing sequential dialogue links (who followed whom), speech content, and speaker attribution for post-session analytics.

---

## Tasks & Fix Slices

### Task 1: Multi-Depth Organic Word Dispersion in `hearth-words.ts` (TDD)
- [ ] Add unit test in `tests/hearth-words.test.ts` asserting words are distributed across diverse radial depths ($\Delta R \ge 0.25$).
- [ ] In `src/canvas/hearth-words.ts`:
  - Replace static `baseR = 0.66` with a multi-depth radial tier array: `[0.55, 0.72, 0.46, 0.82, 0.62, 0.76, 0.50]`.
  - Expand slot search to 40 attempts cycling through radii and angles.
  - Increase collision margin (horizontal padding +32, vertical +26) to prevent clustering.
- [ ] Verify `tests/hearth-words.test.ts` PASS.

### Task 2: Build `SessionAnalytics` Aggregator & Verify Data Links (TDD)
- [ ] Write failing test `tests/session-analytics.test.ts`:
  - Computes speaker turn counts, total words, handoff links, and emotional trajectory.
- [ ] Implement `src/domain/session-analytics.ts` ($\le 120$ lines).
- [ ] Expose `window.__SALON_ANALYTICS__` in `useSalonSession.ts` for instant browser console inspection / export.
- [ ] Verify `tests/session-analytics.test.ts` PASS.

### Task 3: Verification, Ledger & Memory Update
- [ ] Full test suite (`npm test`), `npm run typecheck`, and `npm run build`.
- [ ] Check AP-019 line limits ($\le 250$ lines).
- [ ] Dual-circuit review (Architectural AP-rules PASS + Product PASS).
- [ ] Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- [ ] Commit, push to `origin/main`, restart PM2 `salon-presence`, and log to GBrain.
