/**
 * Contemplative Living Hearth Particles: Licks, Puffs, Convection Embers
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

const TAU = Math.PI * 2;

export interface Lick {
  x: number; y: number; vx: number; vy: number;
  size: number; life: number; maxLife: number; curlPhase: number;
}

export interface Puff {
  x: number; y: number; vx: number; vy: number;
  size: number; life: number; maxLife: number; hue: 'amber' | 'carmine';
}

export interface Spark {
  x: number; y: number; vx: number; vy: number;
  size: number; life: number; maxLife: number; swirl: number;
}

export class HearthParticleSystem {
  public licks: Lick[] = [];
  public puffs: Puff[] = [];
  public sparks: Spark[] = [];

  constructor() {
    for (let i = 0; i < 10; i++) this.licks.push(this.createLick(0, 0, true));
    for (let i = 0; i < 24; i++) this.puffs.push(this.createPuff(0, 0, true));
    for (let i = 0; i < 50; i++) this.sparks.push(this.createSpark(0, 0, true));
  }

  public createLick(cx: number, cy: number, initial = false): Lick {
    return {
      x: cx + (Math.random() - 0.5) * 35,
      y: cy - 40 - Math.random() * 30,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -1.0 - Math.random() * 1.8,
      size: 5 + Math.random() * 8,
      life: initial ? Math.random() * 25 : 0,
      maxLife: 22 + Math.random() * 26,
      curlPhase: Math.random() * TAU,
    };
  }

  public createPuff(cx: number, cy: number, initial = false): Puff {
    return {
      x: cx + (Math.random() - 0.5) * 35,
      y: cy + (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.8 - Math.random() * 1.6,
      size: 24 + Math.random() * 26,
      life: initial ? Math.random() * 35 : 0,
      maxLife: 35 + Math.random() * 30,
      hue: Math.random() < 0.65 ? 'amber' : 'carmine',
    };
  }

  public createSpark(cx: number, cy: number, initial = false): Spark {
    const ang = Math.random() * TAU;
    return {
      x: cx + Math.cos(ang) * (Math.random() * 38),
      y: cy + Math.sin(ang) * (Math.random() * 14),
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.7 - Math.random() * 1.8,
      size: 1.2 + Math.random() * 2.2,
      life: initial ? Math.random() * 100 : 0,
      maxLife: 80 + Math.random() * 125,
      swirl: Math.random() * TAU,
    };
  }

  public render(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, wind: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Detaching Micro-Licks
    for (let i = 0; i < this.licks.length; i++) {
      const lk = this.licks[i];
      if (++lk.life >= lk.maxLife) Object.assign(lk, this.createLick(cx, cy));
      const p = lk.life / lk.maxLife;
      lk.x += lk.vx + Math.sin(t * 3.5 + lk.curlPhase) * 0.55 + wind * 0.05;
      lk.y += lk.vy;
      const alpha = p < 0.25 ? p / 0.25 : 1.0 - p;
      const curR = lk.size * (1 - p * 0.6);
      const grad = ctx.createRadialGradient(lk.x, lk.y, 0, lk.x, lk.y, curR);
      grad.addColorStop(0, `rgba(255, 220, 140, ${alpha * 0.65})`);
      grad.addColorStop(0.6, `rgba(235, 120, 35, ${alpha * 0.35})`);
      grad.addColorStop(1, 'rgba(160, 40, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lk.x, lk.y, curR, 0, TAU);
      ctx.fill();
    }

    // 2. Volumetric Warmth Puffs
    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.puffs[i];
      if (++p.life >= p.maxLife) Object.assign(p, this.createPuff(cx, cy));
      const prog = p.life / p.maxLife;
      p.x += p.vx + Math.sin(t * 2.8 + p.y * 0.04) * 0.25 + wind * 0.03;
      p.y += p.vy;
      const a = prog < 0.25 ? prog / 0.25 : 1.0 - prog;
      const rad = p.size * (1 - prog * 0.45);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      if (p.hue === 'amber') {
        grad.addColorStop(0, `rgba(255, 215, 130, ${a * 0.32})`);
        grad.addColorStop(0.6, `rgba(240, 120, 40, ${a * 0.16})`);
        grad.addColorStop(1, 'rgba(180, 40, 10, 0)');
      } else {
        grad.addColorStop(0, `rgba(240, 130, 40, ${a * 0.22})`);
        grad.addColorStop(0.7, `rgba(180, 40, 10, ${a * 0.08})`);
        grad.addColorStop(1, 'rgba(80, 15, 5, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, TAU);
      ctx.fill();
    }

    // 3. Dancing Convection Embers
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      if (++sp.life >= sp.maxLife) Object.assign(sp, this.createSpark(cx, cy));
      const p = sp.life / sp.maxLife;
      sp.vx = (sp.vx + Math.sin(t * 1.8 + sp.swirl) * 0.04 + wind * 0.02) * 0.96;
      sp.x += sp.vx;
      sp.y += sp.vy;
      const a = p < 0.25 ? p / 0.25 : 1.0 - p;
      ctx.fillStyle = p < 0.4 ? `rgba(255, 230, 180, ${a * 0.85})` : `rgba(255, 160, 70, ${a * 0.65})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * (1 - p * 0.3), 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }
}
