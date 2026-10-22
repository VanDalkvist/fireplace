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

const LOGS: Log[] = [
  { a: -0.65, len: 105, w: 10,   heatPhase: 0.0, speed: 1.6 },
  { a: 0.85,  len: 100, w: 9.5,  heatPhase: 2.1, speed: 2.0 },
  { a: 2.35,  len: 110, w: 10,   heatPhase: 4.2, speed: 1.4 },
  { a: 3.85,  len: 98,  w: 9.5,  heatPhase: 1.3, speed: 1.8 }
];

const TONGUES: Tongue[] = [
  { relX: -6,  relY: -4, width: 44, baseH: 130, speed: 2.2, phase: 0.0, layer: 'core' },
  { relX: 8,   relY: 4,  width: 40, baseH: 122, speed: 1.9, phase: 1.8, layer: 'core' },
  { relX: -32, relY: 3,  width: 30, baseH: 94,  speed: 2.7, phase: 3.2, layer: 'body' },
  { relX: -22, relY: -11, width: 26, baseH: 78, speed: 3.1, phase: 5.1, layer: 'mantle' },
  { relX: 30,  relY: 2,  width: 32, baseH: 96,  speed: 2.5, phase: 2.4, layer: 'body' },
  { relX: 20,  relY: -10, width: 25, baseH: 80, speed: 3.3, phase: 4.3, layer: 'mantle' },
  { relX: -3,  relY: -16, width: 34, baseH: 84, speed: 2.1, phase: 0.9, layer: 'mantle' },
  { relX: 5,   relY: 12,  width: 36, baseH: 68, speed: 2.8, phase: 3.7, layer: 'body' }
];

export class HearthFlameSimulator {
  private particles = new HearthParticleSystem();

  public render(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number, heat = 0.0): void {
    const t = time * 0.001;
    const clampedHeat = Math.max(0, Math.min(1, heat));
    const globalWind = Math.sin(t * 0.45) * 5.5 + Math.sin(t * 1.1) * 2.5;

    // 1. Ambient Ground Light Pool (~0.12 Hz breathing, organically expands with words heat)
    const breath = Math.sin(t * 0.75) * 0.03 + Math.sin(t * 1.5) * 0.015;
    const poolRx = (175 + clampedHeat * 95) * (1.0 + breath);
    const poolRy = (62 + clampedHeat * 32) * (1.0 + breath);

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

    // 2. Ash Bed & Stones
    ctx.save();
    ctx.fillStyle = '#0b0806';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 82, 28, 0, 0, TAU);
    ctx.fill();

    for (let i = 0; i < 12; i++) {
      const sAng = (i / 12) * TAU + 0.15;
      const sx = cx + Math.cos(sAng) * 72;
      const sy = cy + 4 + Math.sin(sAng) * 24;
      ctx.fillStyle = i % 2 === 0 ? '#15100c' : '#1c1510';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 7, 4.5, sAng, 0, TAU);
      ctx.fill();
    }

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
    ctx.restore();

    // 4. Living 1/f Bezier Flame Tongues
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < TONGUES.length; i++) {
      const fl = TONGUES[i];
      const cycle = Math.sin(t * fl.speed + fl.phase);
      const cycle2 = Math.sin(t * (fl.speed * 1.6) + fl.phase * 1.4);
      const activity = Math.max(0.18, cycle * 0.55 + cycle2 * 0.35 + 0.55);

      const localSway = Math.sin(t * (fl.speed * 1.3) + fl.phase) * (5 + clampedHeat * 3) + globalWind;
      const stretch = fl.baseH * (0.55 + activity * 0.35 + clampedHeat * 0.50);
      const width = fl.width * (0.70 + activity * 0.30 + clampedHeat * 0.35);

      const baseX = cx + fl.relX;
      const baseY = cy + fl.relY;
      const tipX = cx + fl.relX * 0.4 + localSway;
      const tipY = cy - stretch;

      const flick = Math.sin(t * 4.2 + fl.phase) * 4;
      const cpLeftX = baseX - width * 0.55 + localSway * 0.35;
      const cpLeftY = cy - stretch * 0.42;
      const cpRightX = baseX + width * 0.55 + localSway * 0.35;
      const cpRightY = cy - stretch * 0.42;

      ctx.beginPath();
      ctx.moveTo(baseX - width * 0.42, baseY);
      ctx.bezierCurveTo(cpLeftX, cpLeftY, tipX - 2 + flick, tipY + 10, tipX + flick, tipY);
      ctx.bezierCurveTo(tipX + 2 + flick, tipY + 10, cpRightX, cpRightY, baseX + width * 0.42, baseY);
      ctx.closePath();

      const flameGrad = ctx.createLinearGradient(baseX, baseY, tipX, tipY);
      const actAlpha = Math.min(1.0, activity);

      if (fl.layer === 'core') {
        flameGrad.addColorStop(0.0, `rgba(255, 245, 210, ${0.72 * actAlpha})`);
        flameGrad.addColorStop(0.35, `rgba(255, 185, 80, ${0.55 * actAlpha})`);
        flameGrad.addColorStop(0.78, `rgba(225, 75, 22, ${0.28 * actAlpha})`);
        flameGrad.addColorStop(1.0, 'rgba(160, 30, 10, 0.0)');
      } else if (fl.layer === 'body') {
        flameGrad.addColorStop(0.0, `rgba(255, 205, 110, ${0.52 * actAlpha})`);
        flameGrad.addColorStop(0.48, `rgba(240, 125, 38, ${0.38 * actAlpha})`);
        flameGrad.addColorStop(0.85, `rgba(190, 45, 15, ${0.16 * actAlpha})`);
        flameGrad.addColorStop(1.0, 'rgba(100, 20, 5, 0.0)');
      } else {
        flameGrad.addColorStop(0.0, `rgba(240, 135, 45, ${0.36 * actAlpha})`);
        flameGrad.addColorStop(0.55, `rgba(195, 65, 20, ${0.20 * actAlpha})`);
        flameGrad.addColorStop(1.0, 'rgba(85, 15, 5, 0.0)');
      }

      ctx.fillStyle = flameGrad;
      ctx.fill();
    }
    ctx.restore();

    // 5. Render licks, puffs, and embers with heat convection
    this.particles.render(ctx, cx, cy, t, globalWind, clampedHeat);
  }
}
