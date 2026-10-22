# Architecture Improvement Plan - Cycle 27: Magnified Majestic Campfire Scale (1.35x–1.40x Expansion)

## Goal
Enlarge the campfire and hearth elements by ~35–40% across the board (flame spires up to 250px, stones radius from 94px to 130px, ash bed, ember bed, ground light pool, and spark spawn radii) while expanding the word clearance zone to give the magnificent roaring fire maximum visual impact on the fullscreen clearing.

## Architecture Context Map
- `src/canvas/hearth-flame.ts`: Renders ambient ground light, organic stones, glowing ash/charcoal bed, logs, and 50 multi-scale flame tongues.
- `src/canvas/hearth-particles.ts`: Renders micro-licks, smoke puffs, and swirling convection embers.
- `src/canvas/hearth-words.ts`: Manages word clearance zone (`distFireX`, `distFireY`) around the central campfire.
- `tests/hearth-flame.test.ts`: Unit test suite verifying canvas rendering and scaled ground light pool.

## Findings Selected for `fix-now`
- **[P1] Under-scaled Fire for Fullscreen Canvas**: On 92% screen-width clearings, the campfire feels slightly compact compared to the vast available space; scaling it up ~35% creates a grand, warm, majestic focal point.
- **[P2] Word Clearance Boundary**: With larger flames leaping to 240+px, the words clearance zone in `hearth-words.ts` must expand proportionally (`distFireX` from 175 to 225, `distFireY` up to -280) so words never collide with the flame tips.

---

## Tasks & Fix Slices

### Task 1: Scale Campfire Anatomy in `hearth-flame.ts` and `hearth-particles.ts` (TDD)
- [ ] Update `tests/hearth-flame.test.ts` to assert enlarged ground light pool and flame heights.
- [ ] In `src/canvas/hearth-flame.ts`:
  - Scale `HEARTH_STONES` radius: `rx = 130 + st.dr * 1.35`, `ry = 42 + st.dr * 0.45`, stone dimensions `w: 16..22`, `h: 8..13`.
  - Scale Ash Bed: radius 134px / 44px.
  - Scale Ember Bed: radius 110px / 36px.
  - Scale Logs: length 136–150px, width 13–14px.
  - Scale Flame Tongues:
    - Tier 1 (4 spires): `baseH: 195..250px`, `width: 32..38px`.
    - Tier 2 (12 body flames): `baseH: 105..155px`, `width: 22..32px`.
    - Tier 3 (16 tonguelets): `baseH: 55..88px`, `width: 14..22px`.
    - Tier 4 (18 micro-flickers): `baseH: 24..42px`, `width: 9..16px`.
    - Max stretch: from 140 to 195.
  - Scale Ground Light Pool: `poolRx = (290 + clampedHeat * 180)`, `poolRy = (105 + clampedHeat * 70)`.
- [ ] In `src/canvas/hearth-particles.ts`:
  - Widen particle spawn radii (sparks up to 52px, licks up to 48px, puffs up to 50px).
- [ ] In `src/canvas/hearth-words.ts`:
  - Widen sacred fire clearance (`distFireX < (225 + halfW)`, `distFireY` bounds).
- [ ] Verify line counts $\le 250$ lines across all modified files (AP-019).
- [ ] Run test suite (`npm test`).

### Task 2: Verification, Ledger & Memory Update
- [ ] Full test suite (`npm test`), `npm run typecheck`, and `npm run build`.
- [ ] Dual-circuit review (Architectural AP-rules PASS + Product PASS).
- [ ] Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- [ ] Commit, push to `origin/main`, restart PM2 `salon-presence`, and log to GBrain.
