# Architecture Improvement Plan - Cycle 31: Hyperrealistic Procedural Campfire Simulation

## Goal
Transform the campfire visualization from static layered teardrop silhouettes into a stunning, organic, breathing campfire grounded in creative coding physics (vorticity confinement, blackbody radiation spectrum, charred logs with glowing thermal fissures, and asymmetric turbulent Bezier ribbons).

## Primary Research & Theoretical Basis
1. **Emergent Mind Bonfire & Jos Stam Stable Fluids**:
   - Flames are driven by buoyancy, upward convection, and lateral vorticity confinement.
   - Symmetrical teardrops look like paper stickers; real flames have independent S-curve contours on left and right edges.
2. **Godrich 2026 Canvas Fire Simulation (Curl Turbulence & Fuel Ladder)**:
   - Fuel temperature cools as it ascends: Blue oxygen root -> Incandescent Gold/White core (1800K) -> Golden Amber (1400K) -> Vermilion Mantle (1000K) -> Deep Carmine/Soot (800K).
   - Log fuel emitters with thermal fissures and glowing charcoal crevices.
3. **ShaderBattle Fire & Taos WebGPU Engine**:
   - Windowed radiance cascade on the ground that softly dissolves into total night under the floating words.
   - Dynamic stone specular highlights catching physical flame flickers.

---

## Tasks & Fix Slices (TDD)

### Task 1: Update Test Suite (`tests/hearth-flame.test.ts`)
- [ ] Assert that flame tongues render with asymmetric S-curves and dual-frequency curl turbulence.
- [ ] Assert that burning logs render with charred bark and pulsating thermal fissures.
- [ ] Assert that oxygen blue root glow and blackbody color ramps are present.

### Task 2: Implement Living Geometry in `src/canvas/hearth-geometry.ts`
- [ ] Add fissure coordinates and thermal crack offsets to `LOGS`.
- [ ] Enhance `buildTongues()` with asymmetric curl phases, detachment rates, and layer hierarchies.
- [ ] Keep file strictly $\le 250$ lines (AP-019).

### Task 3: Implement Hyperrealistic Renderer in `src/canvas/hearth-flame.ts`
- [ ] **Asymmetric Turbulent S-curves**: Replace single-point Beziers with dual-control-point cubic Beziers (`cp1Left`, `cp2Left`, `cp1Right`, `cp2Right`) modulated by curl noise.
- [ ] **Blackbody Radiation Spectrum**:
  - Blue oxygen root glow at log junctions (`rgba(65, 115, 255, 0.24)`).
  - Incandescent gold core gradient with non-saturating alphas (prevents flat white blobs).
  - Rich amber body and carmine mantle with detached licks.
- [ ] **Charred Logs with Thermal Fissures**:
  - Deep textured charred wood silhouette (`#100c09`).
  - Glowing internal cracks (`rgba(255, 150, 40)` and `rgba(255, 220, 90)`) pulsating with heat.
  - Hot charcoal bed between logs with undulating ember core.
- [ ] **Enhanced Stone Highlights & Ground Light**:
  - Refined 3-tier radiance cascade smoothly washing under words without clipping borders.
  - Vibrant fire specular highlights on stones.
- [ ] Keep file strictly $\le 250$ lines (AP-019).

### Task 4: Dual-Circuit Verification & Ledger
- [ ] Full Vitest suite (`npm test`), TypeScript check (`npm run typecheck`), build (`npm run build`).
- [ ] Verify 60 FPS performance and zero allocations on hot paths (AP-055).
- [ ] Update `docs/arch-improvement/review-log.md` and `docs/arch-improvement/memory.md`.
- [ ] Commit, push to `origin/main`, restart PM2 `salon-presence`, and write back to GBrain.
