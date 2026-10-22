# Architecture Improvement Plan - Cycle 29: Radiance Cascade Ground Light & Vibrant Stone Highlights

## Goal
1. **Distant & Organic Ground Light Dissipation**:
   - Replace the clipped artificial oval with a 3-tier true isometric Radiance Cascade ground light.
   - Use coordinate scale transform (`ctx.scale(1.0, 0.36)`) so the radial gradient itself is naturally elliptical, ending at true zero opacity (`rgba(0,0,0,0)`) at the boundary without hard clipping edges.
   - Apply windowed inverse-square attenuation stops (`1 / (1 + (d/r)^2)` and `saturate(1 - (d/R)^4)^2`) across 3 tiers, extending the distant ambient dissipation far out across the meadow ($R \approx 820..1020$px) beneath the floating words.
   - Animate the light with multi-frequency 1/f coherent flicker (`t*1.7`, `t*3.3`, `t*7.1`) so the light pool breathes with the flames.
2. **Vibrant & Dynamic Stone Highlights**:
   - Make fire reflections on the hearth stones significantly more noticeable, natural, and beautiful.
   - Add dual-facet illumination: an intense golden-amber diffuse facet facing the campfire + a crisp specular rim arc along the stone's upper crest.
   - Animate specular highlights with individual fire flicker (`sin(t * 3.6 + ang * 2.8)`), making the stones shimmer dynamically in the dark.

---

## Primary Research & Theoretical Basis
1. **Taos WebGPU Engine / ShaderBattle (Windowed Inverse-Square Attenuation)**:
   - Hard discs occur when radial gradients are clipped by geometric shapes.
   - Solution: In HTML5 Canvas 2D, translate to light origin, scale by isometric ratio `ry / rx = 0.36`, and draw a circular gradient `createRadialGradient(0, 0, 0, 0, 0, R)`. The outer stop at `1.0` is transparent, guaranteeing zero clipping boundary along both X and Y.
2. **Layered Radiance Cascade (Xor GM Shaders / Tile Based Worlds)**:
   - Tier 1: Hearth Core ($rx \approx 220$px) — intense amber/gold, illuminates stones and inner embers.
   - Tier 2: Meadow Mid-Glow ($rx \approx 460$px) — warm honey falloff.
   - Tier 3: Distant Ambient Dissipation ($rx \approx 820..1020$px) — ultra-soft atmospheric haze reaching far under the floating words and towards participant seats.
3. **1/f Coherent Flicker (Carmen Ansio / 1 Murata)**:
   - Combine three non-harmonic sine frequencies (1.7 Hz, 3.3 Hz, 7.1 Hz) to produce continuous, organic flicker that never repeats mechanically.
4. **Specular Rim Reflection (PBR Dielectric Approximation)**:
   - Stones receive diffuse light offset towards `cx, cy` plus a high-intensity specular highlight on the upper crest facing the fire vector `toFire`, blended with `globalCompositeOperation = 'lighter'`.

---

## Tasks & Fix Slices (TDD)

### Task 1: Update Mock Canvas Context & Tests (`tests/hearth-flame.test.ts`)
- [ ] Add `translate` and `scale` mocks to `createCtx` and `mockCtx` in `tests/hearth-flame.test.ts`.
- [ ] Add assertions verifying that ground light spans $\ge 700$px (distant dissipation reaching under words) and scales up with word heat.
- [ ] Assert that stone highlights include both diffuse facet and specular rim stroke.

### Task 2: Implement Radiance Cascade & Vibrant Stone Highlights
- [ ] Keep `src/canvas/hearth-geometry.ts` for clean structural separation (AP-019).
- [ ] In `src/canvas/hearth-flame.ts`:
  - Implement 3-tier scaled isometric radiance cascade with windowed attenuation stops.
  - Implement 1/f multi-frequency flicker for radius and alpha.
  - Implement enhanced `drawStone` with luminous golden diffuse core (`rgba(255, 220, 125)`), dynamic flame flicker, and specular rim arc facing the fire.
- [ ] Verify line counts $\le 250$ lines across all files (AP-019).

### Task 3: Dual-Circuit Verification, Ledger & Deployment
- [ ] Run full test suite (`npm test`), typecheck (`npm run typecheck`), build (`npm run build`).
- [ ] Dual-circuit review (Architectural AP-rules PASS + Product PASS).
- [ ] Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- [ ] Commit, push to `origin/main`, restart PM2 `salon-presence`, and write back to GBrain.
