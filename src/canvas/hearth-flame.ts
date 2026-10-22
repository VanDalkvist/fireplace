/**
 * Contemplative Living Hearth Flame Renderer
 * Multi-tongue organic Bezier fire leaping across charred logs with 1/f draft.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import { HearthParticleSystem } from './hearth-particles';
import { HEARTH_STONES, LOGS, buildTongues, drawHearthStone, type Tongue } from './hearth-geometry';

const TAU = Math.PI * 2;
const TONGUES: Tongue[] = buildTongues();

export class HearthFlameSimulator {
  private particles = new HearthParticleSystem();

  public render(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, heat = 0.0): void {
    const t = time * 0.001;
    const clampedHeat = Math.max(0, Math.min(1, heat));
    const globalWind = Math.sin(t * 0.45) * 5.5 + Math.sin(t * 1.1) * 2.5;

    // 1. Radiance Cascade: 3-tier true isometric light diffusion (reaches under words)
    const flicker = Math.sin(t * 1.7) * 0.04 + Math.sin(t * 3.3 + 1.2) * 0.02 + Math.sin(t * 7.1 + 0.5) * 0.01;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy);
    ctx.scale(1.0, 0.36);

    // Tier 1: Distant Ambient Dissipation (spreads under the floating words across the clearing)
    const distR = (780 + clampedHeat * 220) * (1.0 + flicker);
    const distGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, distR);
    const distAlpha = 0.075 + clampedHeat * 0.055;
    distGrad.addColorStop(0.0, `rgba(245, 140, 50, ${distAlpha * 0.85})`);
    distGrad.addColorStop(0.35, `rgba(215, 95, 30, ${distAlpha * 0.45})`);
    distGrad.addColorStop(0.68, `rgba(160, 45, 12, ${distAlpha * 0.18})`);
    distGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = distGrad;
    ctx.beginPath();
    ctx.arc(0, 0, distR, 0, TAU);
    ctx.fill();

    // Tier 2: Meadow Mid-Glow (warm honey falloff across the inner clearing)
    const midR = (440 + clampedHeat * 140) * (1.0 + flicker * 1.2);
    const midGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, midR);
    const midAlpha = 0.12 + clampedHeat * 0.08;
    midGrad.addColorStop(0.0, `rgba(255, 185, 90, ${midAlpha})`);
    midGrad.addColorStop(0.42, `rgba(230, 110, 35, ${midAlpha * 0.50})`);
    midGrad.addColorStop(0.78, `rgba(140, 35, 10, ${midAlpha * 0.15})`);
    midGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = midGrad;
    ctx.beginPath();
    ctx.arc(0, 0, midR, 0, TAU);
    ctx.fill();

    // Tier 3: Hearth Direct Glow (warm amber pool hugging stone ring)
    const hearthR = (210 + clampedHeat * 70) * (1.0 + flicker * 1.5);
    const hearthGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hearthR);
    const hearthAlpha = 0.16 + clampedHeat * 0.12;
    hearthGrad.addColorStop(0.0, `rgba(255, 230, 160, ${hearthAlpha})`);
    hearthGrad.addColorStop(0.40, `rgba(255, 150, 50, ${hearthAlpha * 0.60})`);
    hearthGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = hearthGrad;
    ctx.beginPath();
    ctx.arc(0, 0, hearthR, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 2. Natural Organic Hearth: Back Stones -> Glowing Ash Bed -> Logs -> Front Stones
    const stoneCoords = HEARTH_STONES.map((st) => {
      const rx = 128 + st.dr * 1.35;
      const ry = 42 + st.dr * 0.45;
      const sx = cx + Math.cos(st.ang) * rx;
      const sy = cy + 4 + Math.sin(st.ang) * ry;
      return { st, sx, sy, isBack: sy < cy + 4 };
    });

    // 2a. Back stones behind ash and flame
    for (const sc of stoneCoords) {
      if (sc.isBack) drawHearthStone(ctx, sc.st, sc.sx, sc.sy, cx, cy, t, clampedHeat);
    }

    // 2b. Organic Ash Bed with undulating perimeter
    ctx.save();
    ctx.fillStyle = '#0a0705';
    ctx.beginPath();
    for (let p = 0; p <= 24; p++) {
      const a = (p / 24) * TAU;
      const rJ = Math.sin(a * 4) * 5.6 + Math.cos(a * 7) * 3.6;
      const ax = cx + Math.cos(a) * (132 + rJ);
      const ay = cy + 4 + Math.sin(a) * (43 + rJ * 0.33);
      if (p === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
    }
    ctx.closePath();
    ctx.fill();

    // 2c. Glowing charcoal and ember core beneath logs
    const emberGrad = ctx.createRadialGradient(cx, cy + 4, 4, cx, cy + 4, 105);
    const emberAlpha = 0.24 + clampedHeat * 0.28;
    emberGrad.addColorStop(0.0, `rgba(240, 95, 20, ${emberAlpha})`);
    emberGrad.addColorStop(0.38, `rgba(180, 50, 10, ${emberAlpha * 0.60})`);
    emberGrad.addColorStop(0.72, `rgba(60, 15, 5, ${emberAlpha * 0.20})`);
    emberGrad.addColorStop(1.0, 'rgba(10, 7, 5, 0.0)');
    ctx.fillStyle = emberGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 110, 36, 0, 0, TAU);
    ctx.fill();

    // 2c-ii. Oxygen blue combustion root at log junctions
    const blueFootGrad = ctx.createRadialGradient(cx, cy + 6, 2, cx, cy + 6, 85);
    blueFootGrad.addColorStop(0.0, 'rgba(65, 115, 255, 0.28)');
    blueFootGrad.addColorStop(0.42, 'rgba(50, 80, 220, 0.14)');
    blueFootGrad.addColorStop(1.0, 'rgba(20, 30, 100, 0.0)');
    ctx.fillStyle = blueFootGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 85, 28, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 3. Charred Burning Logs with glowing thermal fissures
    for (let i = 0; i < LOGS.length; i++) {
      const lg = LOGS[i];
      const cosA = Math.cos(lg.a);
      const sinA = Math.sin(lg.a);
      const lx1 = cx + cosA * (lg.len * 0.5);
      const ly1 = cy + 4 + sinA * (lg.len * 0.18);
      const lx2 = cx - cosA * (lg.len * 0.5);
      const ly2 = cy + 4 - sinA * (lg.len * 0.18);

      // Deep charred bark silhouette
      ctx.strokeStyle = '#100c09';
      ctx.lineWidth = lg.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();

      const logHeat = (Math.sin(t * lg.speed + lg.heatPhase) * 0.2 + 0.65) * (0.75 + clampedHeat * 0.45);
      // Hot internal ember vein
      ctx.strokeStyle = `rgba(240, 95, 25, ${Math.min(0.9, logHeat * 0.70)})`;
      ctx.lineWidth = lg.w * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx + (lx1 - cx) * 0.42, cy + 4 + (ly1 - (cy + 4)) * 0.42);
      ctx.lineTo(cx + (lx2 - cx) * 0.42, cy + 4 + (ly2 - (cy + 4)) * 0.42);
      ctx.stroke();

      // Glowing thermal fissures (cracks) pulsing in the wood
      for (const fis of lg.fissures) {
        const fx1 = cx + cosA * (lg.len * fis.u1);
        const fy1 = cy + 4 + sinA * (lg.len * fis.u1 * 0.36) + fis.offY;
        const fx2 = cx + cosA * (lg.len * fis.u2);
        const fy2 = cy + 4 + sinA * (lg.len * fis.u2 * 0.36) + fis.offY;
        ctx.strokeStyle = `rgba(255, 205, 90, ${Math.min(1.0, logHeat * 0.85)})`;
        ctx.lineWidth = fis.w;
        ctx.beginPath();
        ctx.moveTo(fx1, fy1);
        ctx.lineTo(fx2, fy2);
        ctx.stroke();
      }
    }

    // 2d. Front stones overlapping foreground ash
    for (const sc of stoneCoords) {
      if (!sc.isBack) drawHearthStone(ctx, sc.st, sc.sx, sc.sy, cx, cy, t, clampedHeat);
    }

    // 4. Dense Living Asymmetric Bezier Flame Tongues (50 tongues with curl turbulence)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradBaseY = cy + 8;
    const gradTipY = cy - 195 * (1.0 + clampedHeat * 0.70);

    // Pre-create 3 layer gradients per frame with blackbody spectrum
    const coreGrad = ctx.createLinearGradient(cx, gradBaseY, cx, gradTipY);
    coreGrad.addColorStop(0.0, 'rgba(255, 248, 225, 0.20)');
    coreGrad.addColorStop(0.32, 'rgba(255, 185, 75, 0.16)');
    coreGrad.addColorStop(0.75, 'rgba(230, 80, 20, 0.08)');
    coreGrad.addColorStop(1.0, 'rgba(160, 30, 10, 0.0)');

    const bodyGrad = ctx.createLinearGradient(cx, gradBaseY, cx, gradTipY);
    bodyGrad.addColorStop(0.0, 'rgba(255, 195, 90, 0.15)');
    bodyGrad.addColorStop(0.45, 'rgba(240, 115, 32, 0.10)');
    bodyGrad.addColorStop(0.82, 'rgba(190, 45, 15, 0.05)');
    bodyGrad.addColorStop(1.0, 'rgba(100, 20, 5, 0.0)');

    const mantleGrad = ctx.createLinearGradient(cx, gradBaseY, cx, gradTipY);
    mantleGrad.addColorStop(0.0, 'rgba(240, 125, 35, 0.10)');
    mantleGrad.addColorStop(0.52, 'rgba(195, 55, 16, 0.05)');
    mantleGrad.addColorStop(1.0, 'rgba(85, 15, 5, 0.0)');

    for (let i = 0; i < TONGUES.length; i++) {
      const fl = TONGUES[i];
      const cycle = Math.sin(t * fl.speed + fl.phase);
      const cycle2 = Math.sin(t * (fl.speed * 1.6) + fl.phase * 1.4);
      const activity = Math.max(0.18, cycle * 0.55 + cycle2 * 0.35 + 0.55);

      const localSway = Math.sin(t * (fl.speed * 1.3) + fl.phase) * (5 + clampedHeat * 4) + globalWind;
      const stretch = fl.baseH * (0.80 + activity * 0.40 + clampedHeat * 0.70);
      const width = fl.width * (0.85 + activity * 0.35 + clampedHeat * 0.50);
      const baseX = cx + fl.relX;
      const baseY = cy + fl.relY;
      const tipX = cx + fl.relX * 0.35 + localSway;
      const tipY = cy - stretch;
      const flick = Math.sin(t * 4.2 + fl.phase) * 3.5;

      // Independent dual-frequency curl noise for asymmetric S-curves
      const curlL = Math.sin(t * fl.curlFreq + fl.phase) * (7 + clampedHeat * 5) + fl.asymmetry * 9;
      const curlR = Math.cos(t * (fl.curlFreq * 1.35) + fl.phase + 1.2) * (7 + clampedHeat * 5) - fl.asymmetry * 9;

      ctx.beginPath();
      ctx.moveTo(baseX - width * 0.42, baseY);
      ctx.bezierCurveTo(
        baseX - width * 0.50 + curlL * 0.5, cy - stretch * 0.38,
        tipX - width * 0.18 + curlL, tipY + stretch * 0.22,
        tipX + flick, tipY
      );
      ctx.bezierCurveTo(
        tipX + width * 0.18 + curlR, tipY + stretch * 0.22,
        baseX + width * 0.50 + curlR * 0.5, cy - stretch * 0.38,
        baseX + width * 0.42, baseY
      );
      ctx.closePath();

      ctx.fillStyle = fl.layer === 'core' ? coreGrad : fl.layer === 'body' ? bodyGrad : mantleGrad;
      ctx.fill();
    }
    ctx.restore();

    // 5. Render licks, puffs, and embers with heat convection
    this.particles.render(ctx, cx, cy, t, globalWind, clampedHeat);
  }
}
