# Architecture Improvement Plan - Cycle 25: 7x Dense Living Flame Tongues & Shared Gradient Performance

## Goal
Increase the number of living flame tongues by ~7x (from 8 to 56 multi-layered tongues across core, body, and mantle) while optimizing Canvas 2D performance through shared layer gradients, producing an intensely alive, multi-layered roaring fire with 0 frame drops (60+ FPS).

## Architecture Context Map
- `src/canvas/hearth-flame.ts`: Renders the multi-tongue flame, logs, stones, and ember particles.
- `tests/hearth-flame.test.ts`: Unit test suite verifying flame count, layer rendering, and canvas rendering.

## Findings Selected for `fix-now`
- **[P1] Sparse Flame Morphology (8 Tongues)**: The campfire currently uses only 8 static tongues, making the fire feel somewhat low-density / sparse compared to the rich organic hearth.
- **[P1] GC Pressure on Scaling**: Scaling to 56+ tongues by creating 56 separate `createLinearGradient()` instances every frame (3,360/s) causes garbage collection pauses.

---

## Tasks & Fix Slices

### Task 1: Implement Dense Procedural Tongues & Layer Gradient Sharing (TDD)
- [ ] Write unit test verifying that `hearth-flame` renders $\ge 50$ living flame tongues with shared layer gradients and multi-layer depth.
- [ ] In `src/canvas/hearth-flame.ts`:
  - Implement `generateTongues()` producing 56 tongues: 12 core, 24 body, 20 mantle.
  - Implement shared layer gradients: create `coreGrad`, `bodyGrad`, `mantleGrad` once per frame spanning the active flame height.
  - Render all 56 tongues with individual 1/f wind sway, stretch, and flick physics.
  - Maintain AP-019 limit ($\le 250$ lines).
- [ ] Run test suite (`npm test tests/hearth-flame.test.ts`).

### Task 2: Verification, Ledger & Memory Update
- [ ] Verify full test suite (`npm test`), `npm run typecheck`, and `npm run build`.
- [ ] Dual-circuit review (Architectural AP-rules PASS + Product PASS).
- [ ] Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- [ ] Commit, push to `origin/main`, restart PM2 `salon-presence`, and log to GBrain.
