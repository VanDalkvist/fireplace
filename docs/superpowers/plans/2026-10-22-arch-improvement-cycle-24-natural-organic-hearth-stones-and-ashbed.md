# Architecture Improvement Plan - Cycle 24: Natural Organic Hearth Stones and Ash Bed

## Goal
Transform the hearth (очаг) around the campfire from an artificial, geometric ellipse into a natural, organic stone ring and living ash bed with depth, varied rock morphology, and fire-lit facets, while preserving the existing flame tongues, logs, and ember physics unchanged.

## Architecture Context Map
- `src/canvas/hearth-flame.ts`: Renders the ambient ground light pool, ash bed, stone perimeter, logs, flame tongues, and embers.
- `tests/hearth-flame.test.ts`: Unit test suite verifying canvas rendering, ground light pool, and stone ring structure.

## Findings Selected for `fix-now`
- **[P1] Artificial Geometric Hearth Ring**: The stone ring consists of 14 identical 8x5 ellipses evenly spaced around an exact mathematical ellipse (`rx=92, ry=30`), creating a synthetic "CAD-like" circle in contrast to the organic flame.
- **[P1] Flat Monolithic Ash Bed**: The ash bed is a single flat `#0b0806` ellipse without natural perimeter undulation, charcoal depth, or warm ember glow beneath the logs.
- **[P2] Missing Isometric Depth & Lighting on Stones**: Stones lack fire-facing warm highlights and outer shadow facets, and are rendered in a single flat pass rather than with depth.

---

## Tasks & Fix Slices

### Task 1: Design and Implement Organic Hearth Stones & Ash Bed (TDD)
- [ ] Write unit test verifying that the hearth incorporates organic multi-stone morphology (varied dimensions, angles, and highlights) and layered ash bed.
- [ ] In `src/canvas/hearth-flame.ts`:
  - Define a structured stone ring dataset `HEARTH_STONES` with natural rock variations (angles, radii perturbations, widths, heights, tilt rotations, and tone values).
  - Split rendering into:
    1. Outer/Ambient ground light pool.
    2. Organic ash bed polygon with natural perimeter wobble and warm glowing charcoal core (`rgba(220, 80, 20, ...)` pulsing with heat).
    3. Back stones (behind fire, $y < cy$).
    4. Burning logs (untouched).
    5. Front stones (in foreground, $y \ge cy$) overlapping the ash rim with warm inner fire highlights.
    6. Living flames and embers (untouched).
- [ ] Ensure line count stays $\le 250$ lines (AP-019).
- [ ] Run test suite (`npm test tests/hearth-flame.test.ts`).

### Task 2: Verification, Ledger & Memory Update
- [ ] Verify full test suite (`npm test`), `npm run typecheck`, and `npm run build`.
- [ ] Dual-circuit review (Architectural AP-rules PASS + Product PASS).
- [ ] Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- [ ] Commit, push to `origin/main`, restart PM2 `salon-presence`, and log to GBrain.
