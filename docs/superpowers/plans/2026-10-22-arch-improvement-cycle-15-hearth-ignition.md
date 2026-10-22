# Arch Improvement Cycle 15: Hearth Ignition & Word Energy Accumulation

## Goal
Implement the progressive campfire ignition mechanic in `salon-presence`: as participants speak and words accumulate in the shared clearing, the central campfire organically grows from a gentle, low-ember glow into a vibrant, tall, roaring hearth with wider ambient light, higher leaping flame tongues, and vigorous convective sparks.

## Architecture Context Map Reference
- `src/canvas/hearth-flame.ts`: `HearthFlameSimulator` renders burning logs, ground ambient light pool, and Bezier flame tongues.
- `src/canvas/hearth-particles.ts`: `HearthParticleSystem` renders detaching micro-licks, warmth puffs, and convective sparks.
- `src/canvas/motion-engine.ts`: `SalonMotionEngine` coordinates tokens, words, seats, and the campfire.
- `tests/hearth-flame.test.ts`: Unit tests verifying flame simulation behavior and heat scaling.

## Selected Fixes / Features
- [fix-now] `HearthFlameSimulator` accepts dynamic `heat: number` (0.0 to 1.0) and scales flame height, width, brightness, and ambient ground pool radius.
- [fix-now] `HearthParticleSystem` accepts `heat` to scale convective lift speed and spark activity.
- [fix-now] `SalonMotionEngine` models heat accumulation with asymptotic saturation from total words in circle plus instantaneous speech boost with smooth interpolation.
- [fix-now] Deterministic unit tests in `tests/hearth-flame.test.ts` and `tests/motion-engine.test.ts` protecting heat calculation and rendering boundaries.

## Plan Slices

### Slice 1: Unit Test & Flame Simulation Heat Physics (TDD)
- **Failing Test Step**: In `tests/hearth-flame.test.ts`, write tests asserting that `HearthFlameSimulator.render` accepts `heat` parameter, and calculates expected height/pool scale without error. Also add unit test for heat calculation formula.
- **Expected Failure**: Test fails because `render` does not accept `heat` or does not scale flame properties.
- **Minimal Implementation Step**: Update `HearthFlameSimulator` in `src/canvas/hearth-flame.ts` and `HearthParticleSystem` in `src/canvas/hearth-particles.ts` to accept `heat: number` (clamped 0..1), scaling:
  1. Ambient light pool `poolRx` and `poolRy` from 180px/65px to 280px/100px.
  2. Flame tongue stretch from `0.65` to `1.45`.
  3. Burning log core heat.
  4. Particle convective rise velocity.
- **Passing Test Step**: Run `bun run test tests/hearth-flame.test.ts`.

### Slice 2: Motion Engine Heat Accumulation & Integration (TDD)
- **Failing Test Step**: In `tests/motion-engine.test.ts`, write test for `computeHeat(wordCount, isSpeaking)` demonstrating:
  - 0 words -> heat is at baseline 0.0 (or small speech boost).
  - 10 words -> heat rises towards ~0.5.
  - 30+ words -> heat approaches asymptotic maximum ~0.9.
  - Smooth lerp of `currentHeat`.
- **Expected Failure**: Method/property not present on `SalonMotionEngine`.
- **Minimal Implementation Step**: Implement heat calculation and smoothing in `SalonMotionEngine` (`src/canvas/motion-engine.ts`), passing `currentHeat` to `flame.render(ctx, cx, cy, time, this.currentHeat)`.
- **Passing Test Step**: Run `bun run test tests/motion-engine.test.ts`.

### Slice 3: Verification & Review Gates (Dual-Circuit S9 Gate)
- Run `bun run test`, `bun run typecheck`, `npx madge --circular --extensions ts,tsx src/`, `wc -l`.
- Build with `bun run build` and restart PM2.
- Spawn dual-circuit reviewers with Gemini 3.8 High:
  1. Architectural Reviewer (`arch-rules-implementation-review`).
  2. Product Reviewer (`arch-improvement-product-review`).
- Both must report `VERDICT: PASS`.

### Slice 4: Ledger & Memory Update
- Record Cycle 15 in `docs/arch-improvement/review-log.md`.
- Save durable lesson to GBrain.
