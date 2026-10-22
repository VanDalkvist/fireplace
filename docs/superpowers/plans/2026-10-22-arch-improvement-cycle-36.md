# Arch Improvement Cycle 36: Campfire Flame Radial Growth & 1-Hour Saturation Curve

## Goal
Implement organic radial expansion of the campfire flame envelope in response to spoken phrases, ensuring that:
1. The physical hearth (stones, ash bed) remains unchanged in size.
2. The flame envelope (base positions of tongues, ember core, tongue widths) expands radially in proportion to circle heat.
3. The flame radius strictly stays bounded inside the hearth stones ($R_{flame} < R_{stones} \approx 128\text{px}$) even at maximum heat.
4. The heat accumulation curve supports a natural 1-hour session (30-60 phrases) with asymptotic saturation ($k = 28$) and soft impulse on each new phrase.

## Architecture Context Map
- `src/canvas/hearth-flame.ts`: Flame tongues, ember bed, and oxygen root radial scaling.
- `src/canvas/motion-engine.ts`: Target heat calculation (`computeTargetHeat`), word accretion rate, and phrase impulse decay.
- `tests/hearth-flame.test.ts`: Geometric boundary assertions verifying flame envelope radius $\le$ hearth stones radius.
- `tests/motion-engine.test.ts`: 1-hour session progression tests (0, 15, 30, 60 phrases).

## Selected Fixes (Triage)
- [x] **[P1] Flame Envelope Radial Expansion**: Scale `relX` and `relY` of tongues by `flameRadiusScale = 0.65 + clampedHeat * 0.70` (range 0.65x to 1.35x), expanding flame base across logs without touching stones.
- [x] **[P1] 1-Hour Session Accretion Curve**: Tune `computeTargetHeat` from `-wordCount / 9` to `-wordCount / 28 * 0.88`, plus 0.09 impulse on new words.
- [x] **[P2] Hearth Stone Invariant**: Ensure stones, logs, and ash bed geometry remain fixed, and flame envelope strictly never exceeds stone ellipse.

## Tasks
- [ ] Task 1: Add failing test for 1-hour heat accretion curve in `tests/motion-engine.test.ts`.
- [ ] Task 2: Update `computeTargetHeat` in `src/canvas/motion-engine.ts` with $k = 28$ and verify Task 1 passes.
- [ ] Task 3: Add failing test in `tests/hearth-flame.test.ts` asserting radial expansion of flame tongues without breaching the stone ring boundary ($< 120\text{px}$).
- [ ] Task 4: Implement radial tongue scaling and ember core scaling in `src/canvas/hearth-flame.ts`.
- [ ] Task 5: Verify all tests (132+), types (`tsc --noEmit`), and production build (`vite build`).
- [ ] Task 6: Run dual-circuit review (Architectural and Product) with autonomous subagents (`antigravity/gemini-3.8-flash --reasoning-level high`).
- [ ] Task 7: Update `review-log.md` ledger and gbrain memory.
