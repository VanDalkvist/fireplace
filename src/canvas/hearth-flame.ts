/**
 * Contemplative Living Hearth Flame Renderer
 * Multi-tongue organic Bezier fire leaping across charred logs with 1/f draft.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import { HearthParticleSystem } from './hearth-particles';

const TAU = Math.PI * 2;

interface Log { a: number; len: number; w: number; heatPhase: number; speed: number; }
interface Tongue {
  relX: number; relY: number; width: number; baseH: number; speed: number; phase: number;
  layer: 'core' | 'body' | 'mantle';
}
interface Stone {
  ang: number; dr: number; w: number; h: number; rot: number; shade: string;
}

const HEARTH_STONES: Stone[] = [
  { ang: 0.08, dr: 3,  w: 19, h: 11, rot: 0.12,  shade: '#201813' },
  { ang: 0.46, dr: -4, w: 14, h: 9,  rot: 0.28,  shade: '#18120e' },
  { ang: 0.84, dr: 5,  w: 20, h: 12, rot: -0.18, shade: '#251d17' },
  { ang: 1.26, dr: -3, w: 15, h: 9,  rot: 0.14,  shade: '#1b1410' },
  { ang: 1.64, dr: 4,  w: 22, h: 12, rot: 0.02,  shade: '#231a15' },
  { ang: 2.04, dr: -5, w: 13, h: 8,  rot: -0.25, shade: '#16110d' },
  { ang: 2.42, dr: 3,  w: 18, h: 10, rot: 0.18,  shade: '#211914' },
  { ang: 2.82, dr: -3, w: 15, h: 9,  rot: -0.12, shade: '#1a130f' },
  { ang: 3.20, dr: 4,  w: 20, h: 11, rot: 0.06,  shade: '#241c16' },
  { ang: 3.60, dr: -4, w: 14, h: 8,  rot: 0.22,  shade: '#17110d' },
  { ang: 4.00, dr: 3,  w: 18, h: 10, rot: -0.16, shade: '#221a15' },
  { ang: 4.40, dr: -3, w: 15, h: 9,  rot: 0.12,  shade: '#19130f' },
  { ang: 4.78, dr: 5,  w: 22, h: 12, rot: -0.08, shade: '#261e18' },
  { ang: 5.18, dr: -5, w: 13, h: 8,  rot: 0.26,  shade: '#16110d' },
  { ang: 5.56, dr: 3,  w: 17, h: 10, rot: -0.14, shade: '#1f1813' },
  { ang: 5.94, dr: -2, w: 15, h: 9,  rot: 0.18,  shade: '#1a130f' },
];

const LOGS: Log[] = [
  { a: -0.65, len: 144, w: 13.5, heatPhase: 0.0, speed: 1.6 },
  { a: 0.85,  len: 138, w: 13.0, heatPhase: 2.1, speed: 2.0 },
  { a: 2.35,  len: 150, w: 14.0, heatPhase: 4.2, speed: 1.4 },
  { a: 3.85,  len: 135, w: 13.0, heatPhase: 1.3, speed: 1.8 }
];

function buildTongues(): Tongue[] {
  const t: Tongue[] = [
    { relX: -16, relY: -4, width: 36, baseH: 235, speed: 1.6, phase: 0.2, layer: 'core' },
    { relX: 5,   relY: 3,  width: 38, baseH: 250, speed: 1.8, phase: 2.1, layer: 'core' },
    { relX: 24,  relY: -5, width: 30, baseH: 215, speed: 2.0, phase: 4.3, layer: 'core' },
    { relX: -34, relY: 1,  width: 28, baseH: 195, speed: 1.9, phase: 5.7, layer: 'core' },
  ];
  for (let i = 0; i < 12; i++) {
    const cx = ((i % 3) - 1) * 32 + ((i % 2 === 0 ? 1 : -1) * 8);
    t.push({ relX: cx, relY: Math.sin(i * 1.9) * 8 - 1, width: 22 + (i % 3) * 7, baseH: 110 + (i % 4) * 15, speed: 2.1 + (i % 4) * 0.28, phase: i * 0.72 + 1.1, layer: 'body' });
  }
  for (let i = 0; i < 16; i++) {
    t.push({ relX: (i - 7.5) * 7.0 + Math.sin(i * 1.5) * 5, relY: Math.cos(i * 1.7) * 9 + 4, width: 15 + (i % 3) * 5, baseH: 55 + (i % 5) * 8, speed: 2.6 + (i % 4) * 0.35, phase: i * 0.58 + 2.4, layer: 'mantle' });
  }
  for (let i = 0; i < 18; i++) {
    const s = i % 2 === 0 ? 1 : -1;
    t.push({ relX: s * (14 + i * 3.0), relY: 5 + Math.sin(i * 2.3) * 6, width: 10 + (i % 3) * 4, baseH: 25 + (i % 4) * 6, speed: 3.2 + (i % 3) * 0.45, phase: i * 0.81 + 3.7, layer: 'mantle' });
  }
  return t;
}

const TONGUES: Tongue[] = buildTongues();

export class HearthFlameSimulator {
  private particles = new HearthParticleSystem();

  public render(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, heat = 0.0): void {
    const t = time * 0.001;
    const clampedHeat = Math.max(0, Math.min(1, heat));
    const globalWind = Math.sin(t * 0.45) * 5.5 + Math.sin(t * 1.1) * 2.5;

    // 1. Ambient Ground Light Pool (~0.12 Hz breathing, organically expands with words heat)
    const breath = Math.sin(t * 0.75) * 0.03 + Math.sin(t * 1.5) * 0.015;
    const poolRx = (290 + clampedHeat * 180) * (1.0 + breath);
    const poolRy = (105 + clampedHeat * 70) * (1.0 + breath);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const poolGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, poolRx);
    const poolAlpha = 0.16 + clampedHeat * 0.10;
    poolGrad.addColorStop(0.0, `rgba(255, 205, 145, ${poolAlpha})`);
    poolGrad.addColorStop(0.45, `rgba(215, 110, 40, ${poolAlpha * 0.55})`);
    poolGrad.addColorStop(0.78, `rgba(110, 25, 8, ${poolAlpha * 0.18})`);
    poolGrad.addColorStop(1.0, 'rgba(5, 5, 5, 0.0)');
    ctx.fillStyle = poolGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, poolRx * 1.35, poolRy * 1.35, 0, 0, TAU);
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

      // Fire-facing warm rim highlight
      const toFire = Math.atan2(cy - sc.sy, cx - sc.sx);
      const hx = sc.sx + Math.cos(toFire) * (sc.st.w * 0.22);
      const hy = sc.sy + Math.sin(toFire) * (sc.st.h * 0.22);
      const hlGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, sc.st.w * 0.45);
      hlGrad.addColorStop(0, `rgba(235, 115, 35, ${0.16 + clampedHeat * 0.14})`);
      hlGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.ellipse(hx, hy, sc.st.w * 0.32, sc.st.h * 0.32, rot, 0, TAU);
      ctx.fill();
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
