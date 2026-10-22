# Architectural Review Log: salon-presence

## Cycle 36: Campfire Flame Radial Growth & 1-Hour Saturation Curve (2026-10-22)

### Context & Goal
- User requested organic radial expansion of the campfire flame envelope in response to spoken phrases without altering the physical size of the stone hearth ring.
- Desired behavior: gradual growth over a 1-hour session (30-60 phrases) with asymptotic saturation, strictly bounded inside the hearth stones.

### Decisions & Architecture Invariants
1. **Fixed Physical Hearth (AP-010, AP-013)**: Stones (`HEARTH_STONES`), logs (`LOGS`), and ash bed polygon remain strictly constant in geometry.
2. **Radial Flame Envelope (AP-055)**:
   - Scale factor: `flameRadiusScale = 0.62 + clampedHeat * 0.66` applied to `relX` and `relY` of tongues.
   - Ember core expands from $R_x = 78\text{px}$ to $110\text{px}$ ($R_y = 26\text{px}$ to $36\text{px}$).
   - Blue oxygen combustion foot expands from $R_x = 60\text{px}$ to $85\text{px}$ ($R_y = 20\text{px}$ to $28\text{px}$).
   - Maximum tongue reach at full heat is $\le 92\text{px}$, leaving a $> 28\text{px}$ safety margin inside the stone ring ($R \ge 121\text{px}$).
3. **1-Hour Session Accretion Curve**:
   - Replaced premature $k=9$ formula with $k=28$: `computeTargetHeat = (1 - Math.exp(-wordCount / 28)) * 0.88`.
   - Progression: 1 phrase $\approx 0.03$, 15 phrases $\approx 0.36$, 30 phrases $\approx 0.58$, 60 phrases $\approx 0.78$.
   - $+0.22$ new-phrase impulse with exponential relaxation ($0.035/\text{frame}$) provides tactile speaking feedback.
4. **Zero-Allocation Hot Path (AP-055)**:
   - Eliminated `Array.prototype.map` and 16 intermediate object allocations per frame in `hearth-flame.ts`. Back and front stone coordinates are computed on the fly in indexed `for` loops.
5. **Throttled Persistence (AP-055, AP-023)**:
   - Throttled `updatePersistedHeat` in `motion-engine.ts` to execute once every 5 seconds instead of ~16 times per second.
6. **File Size Budget (AP-019)**:
   - `src/canvas/hearth-flame.ts`: 244 lines ($\le 250$).
   - `src/canvas/motion-engine.ts`: 180 lines ($\le 250$).
   - `tests/hearth-flame.test.ts`: 203 lines ($\le 250$).
   - `tests/hearth-flame-expansion.test.ts`: 94 lines ($\le 250$).

### Verification & Dual-Circuit Review
- Vitest: 33 test files, 135 tests passing cleanly.
- TypeScript: `tsc --noEmit` 0 errors.
- Vite: Production build succeeds in 245ms.
- Architectural Reviewer (`thr_qe4k97td97`): VERDICT: PASS (all P2s resolved).
- Product Reviewer (`thr_bsdsrjz3pa`): VERDICT: PASS.

## Cycle 37: Pure Minimal Floating Interface & Borderless Atmosphere (2026-10-22)

### Context & Goal
- Remove all artificial button and container borders across the application, centering visual focus entirely on the campfire and the contemplative meadow clearing.
- Strip away redundant interface chrome: analytics buttons, pult buttons, technical controls drawer, meeting audio toggle, phase selectors, and music controls.
- Transform header to clean, borderless typography: `салон присутствия · разговор у костра`.
- Retain only the quiet, borderless floating microphone toggle at the bottom HUD.

### Decisions & Changes
1. **SalonHeader**:
   - Removed borders, analytics trigger, pult trigger, and heavy backdrop.
   - Text updated: `салон присутствия · разговор у костра`.
2. **VoiceIndicator**:
   - Stripped all border frames (`border-0`, no border classes on button, error toasts, or badges).
   - Floats cleanly on subtle dark glass `bg-black/25 hover:bg-black/45 rounded-full`.
3. **Button Component (`src/components/ui/button.tsx`)**:
   - Removed borders from all variants (`default`, `primary`, `destructive`, `outline`).
4. **SalonControls Removal**:
   - Eliminated Zoom meeting audio toggle, music toggle, phase selector buttons, and drawer from `SalonExperience.tsx`.
5. **Code Hygiene & Boundaries (AP-019, AP-029)**:
   - `SalonExperience.tsx`: 152 lines ($\le 250$).
   - `SalonHeader.tsx`: 12 lines ($\le 250$).
   - `VoiceIndicator.tsx`: 119 lines ($\le 250$).
   - 0 TypeScript warnings, 0 unused variables.

### Verification
- Vitest: 33 test files, 135 tests passing cleanly.
- TypeScript: `tsc --noEmit` 0 errors.
- Vite: Production build succeeds in 318ms.
- PM2: restarted cleanly on port 4343.

