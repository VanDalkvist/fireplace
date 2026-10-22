/**
 * Contemplative Living Hearth Flame Renderer
 * Multi-tongue organic Bezier fire leaping across charred logs with 1/f draft.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import { HearthParticleSystem } from './hearth-particles';
import { HEARTH_STONES, LOGS, buildTongues, type Tongue } from './hearth-geometry';

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

    const drawStone = (sc: typeof stoneCoords[0]) => {
      const rot = sc.st.rot + Math.atan2(sc.sy - cy, sc.sx - cx) + Math.PI / 2;
      ctx.fillStyle = sc.st.shade;
      ctx.beginPath();
      ctx.ellipse(sc.sx, sc.sy, sc.st.w * 0.5, sc.st.h * 0.5, rot, 0, TAU);
      ctx.fill();

      // Fire-facing warm facet highlight with dancing flicker (additive lighting)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const toFire = Math.atan2(cy - sc.sy, cx - sc.sx);
      const stoneFlicker = Math.sin(t * 3.8 + sc.st.ang * 2.5) * 0.08;
      const hx = sc.sx + Math.cos(toFire) * (sc.st.w * 0.24);
      const hy = sc.sy + Math.sin(toFire) * (sc.st.h * 0.24);
      const hlGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, sc.st.w * 0.52);
      const hlAlpha = Math.max(0.1, 0.36 + clampedHeat * 0.28 + stoneFlicker);
      hlGrad.addColorStop(0, `rgba(255, 225, 135, ${hlAlpha})`);
      hlGrad.addColorStop(0.45, `rgba(240, 120, 40, ${hlAlpha * 0.65})`);
      hlGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc.st.w * 0.40, sc.st.h * 0.40, rot, 0, TAU);
      ctx.fill();

      // Glowing specular rim on top edge facing the flames
      ctx.strokeStyle = `rgba(255, 215, 120, ${0.35 + clampedHeat * 0.25 + stoneFlicker * 0.5})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(sc.sx, sc.sy, sc.st.w * 0.46, sc.st.h * 0.46, rot, toFire - 0.75, toFire + 0.75);
      ctx.stroke();
      ctx.restore();
    };

    // 2a. Back stones behind ash and flame
    for (const sc of stoneCoords) if (sc.isBack) drawStone(sc);

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
    ctx.restore();

    // 3. Burning Logs
    for (let i = 0; i < LOGS.length; i++) {
      const lg = LOGS[i];
      const lx1 = cx + Math.cos(lg.a) * (lg.len * 0.5);
      const ly1 = cy + 4 + Math.sin(lg.a) * (lg.len * 0.18);
      const lx2 = cx - Math.cos(lg.a) * (lg.len * 0.5);
      const ly2 = cy + 4 - Math.sin(lg.a) * (lg.len * 0.18);

      ctx.strokeStyle = '#140f0a';
      ctx.lineWidth = lg.w;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();

      const logHeat = (Math.sin(t * lg.speed + lg.heatPhase) * 0.2 + 0.65) * (0.75 + clampedHeat * 0.45);
      ctx.strokeStyle = `rgba(245, 115, 30, ${Math.min(1.0, logHeat * 0.75)})`;
      ctx.lineWidth = lg.w * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx + (lx1 - cx) * 0.35, cy + 4 + (ly1 - (cy + 4)) * 0.35);
      ctx.lineTo(cx + (lx2 - cx) * 0.35, cy + 4 + (ly2 - (cy + 4)) * 0.35);
      ctx.stroke();
    }

    // 2d. Front stones overlapping foreground ash
    for (const sc of stoneCoords) if (!sc.isBack) drawStone(sc);

    // 4. Dense Living 1/f Bezier Flame Tongues (50 tongues with shared layer gradients)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gradBaseY = cy + 8;
    const gradTipY = cy - 195 * (1.0 + clampedHeat * 0.70);

    // Pre-create 3 layer gradients per frame
    const coreGrad = ctx.createLinearGradient(cx, gradBaseY, cx, gradTipY);
    coreGrad.addColorStop(0.0, 'rgba(255, 245, 215, 0.24)');
    coreGrad.addColorStop(0.32, 'rgba(255, 185, 80, 0.18)');
    coreGrad.addColorStop(0.75, 'rgba(225, 75, 20, 0.09)');
    coreGrad.addColorStop(1.0, 'rgba(160, 30, 10, 0.0)');

    const bodyGrad = ctx.createLinearGradient(cx, gradBaseY, cx, gradTipY);
    bodyGrad.addColorStop(0.0, 'rgba(255, 200, 100, 0.16)');
    bodyGrad.addColorStop(0.45, 'rgba(240, 120, 35, 0.11)');
    bodyGrad.addColorStop(0.82, 'rgba(190, 45, 15, 0.05)');
    bodyGrad.addColorStop(1.0, 'rgba(100, 20, 5, 0.0)');

    const mantleGrad = ctx.createLinearGradient(cx, gradBaseY, cx, gradTipY);
    mantleGrad.addColorStop(0.0, 'rgba(240, 130, 40, 0.11)');
    mantleGrad.addColorStop(0.52, 'rgba(195, 60, 18, 0.06)');
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
      const tipX = cx + fl.relX * 0.4 + localSway;
      const tipY = cy - stretch;
      const flick = Math.sin(t * 4.2 + fl.phase) * 3.5;
      const cpLeftX = baseX - width * 0.52 + localSway * 0.32;
      const cpRightX = baseX + width * 0.52 + localSway * 0.32;
      const cpY = cy - stretch * 0.42;

      ctx.beginPath();
      ctx.moveTo(baseX - width * 0.42, baseY);
      ctx.bezierCurveTo(cpLeftX, cpY, tipX - 2 + flick, tipY + 8, tipX + flick, tipY);
      ctx.bezierCurveTo(tipX + 2 + flick, tipY + 8, cpRightX, cpY, baseX + width * 0.42, baseY);
      ctx.closePath();

      ctx.fillStyle = fl.layer === 'core' ? coreGrad : fl.layer === 'body' ? bodyGrad : mantleGrad;
      ctx.fill();
    }
    ctx.restore();

    // 5. Render licks, puffs, and embers with heat convection
    this.particles.render(ctx, cx, cy, t, globalWind, clampedHeat);
  }
}
