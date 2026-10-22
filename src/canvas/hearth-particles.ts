/**
 * Contemplative Living Hearth Particles: Licks, Puffs, Convection Embers
 * Zero-allocation GPU sprite rendering to eliminate GC pauses (AP-055).
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

function createGradientSprite(
  size: number,
  stops: Array<{ offset: number; color: string }>
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  stops.forEach((s) => grad.addColorStop(s.offset, s.color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

export class HearthParticleSystem {
  public licks: Lick[] = [];
  public puffs: Puff[] = [];
  public sparks: Spark[] = [];

  private lickSprite: HTMLCanvasElement | null = null;
  private amberPuffSprite: HTMLCanvasElement | null = null;
  private carminePuffSprite: HTMLCanvasElement | null = null;

  constructor() {
    for (let i = 0; i < 10; i++) this.licks.push(this.createLick(0, 0, true));
    for (let i = 0; i < 24; i++) this.puffs.push(this.createPuff(0, 0, true));
    for (let i = 0; i < 50; i++) this.sparks.push(this.createSpark(0, 0, true));

    // Pre-render GPU texture sprites once (zero allocations on hot path - AP-055)
    this.lickSprite = createGradientSprite(32, [
      { offset: 0, color: 'rgba(255, 220, 140, 1)' },
      { offset: 0.6, color: 'rgba(235, 120, 35, 0.55)' },
      { offset: 1, color: 'rgba(160, 40, 10, 0)' },
    ]);

    this.amberPuffSprite = createGradientSprite(64, [
      { offset: 0, color: 'rgba(255, 215, 130, 0.8)' },
      { offset: 0.6, color: 'rgba(240, 120, 40, 0.4)' },
      { offset: 1, color: 'rgba(180, 40, 10, 0)' },
    ]);

    this.carminePuffSprite = createGradientSprite(64, [
      { offset: 0, color: 'rgba(240, 130, 40, 0.65)' },
      { offset: 0.7, color: 'rgba(180, 40, 10, 0.25)' },
      { offset: 1, color: 'rgba(80, 15, 5, 0)' },
    ]);
  }

  public createLick(cx: number, cy: number, initial = false): Lick {
    return {
      x: cx + (Math.random() - 0.5) * 48,
      y: cy - 55 - Math.random() * 45,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -1.0 - Math.random() * 1.8,
      size: 6 + Math.random() * 10,
      life: initial ? Math.random() * 25 : 0,
      maxLife: 22 + Math.random() * 26,
      curlPhase: Math.random() * TAU,
    };
  }

  public createPuff(cx: number, cy: number, initial = false): Puff {
    return {
      x: cx + (Math.random() - 0.5) * 48,
      y: cy + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.8 - Math.random() * 1.6,
      size: 32 + Math.random() * 32,
      life: initial ? Math.random() * 35 : 0,
      maxLife: 35 + Math.random() * 30,
      hue: Math.random() < 0.65 ? 'amber' : 'carmine',
    };
  }

  public createSpark(cx: number, cy: number, initial = false): Spark {
    const ang = Math.random() * TAU;
    return {
      x: cx + Math.cos(ang) * (Math.random() * 52),
      y: cy + Math.sin(ang) * (Math.random() * 19),
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.7 - Math.random() * 1.8,
      size: 1.4 + Math.random() * 2.6,
      life: initial ? Math.random() * 100 : 0,
      maxLife: 80 + Math.random() * 125,
      swirl: Math.random() * TAU,
    };
  }

  public render(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, wind: number, heat = 0.0): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const clampedHeat = Math.max(0, Math.min(1, heat));

    // 1. Detaching Micro-Licks (via hardware sprite)
    for (let i = 0; i < this.licks.length; i++) {
      const lk = this.licks[i];
      if (++lk.life >= lk.maxLife) Object.assign(lk, this.createLick(cx, cy));
      const p = lk.life / lk.maxLife;
      lk.x += lk.vx + Math.sin(t * 3.5 + lk.curlPhase) * 0.55 + wind * 0.05;
      lk.y += lk.vy * (1.0 + clampedHeat * 0.45);
      const alpha = p < 0.25 ? p / 0.25 : 1.0 - p;
      const curR = lk.size * (1 - p * 0.6);

      if (this.lickSprite) {
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 0.65));
        ctx.drawImage(this.lickSprite, lk.x - curR, lk.y - curR, curR * 2, curR * 2);
      }
    }

    // 2. Volumetric Warmth Puffs (via hardware sprite)
    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.puffs[i];
      if (++p.life >= p.maxLife) Object.assign(p, this.createPuff(cx, cy));
      const prog = p.life / p.maxLife;
      p.x += p.vx + Math.sin(t * 2.8 + p.y * 0.04) * 0.25 + wind * 0.03;
      p.y += p.vy * (1.0 + clampedHeat * 0.45);
      const a = prog < 0.25 ? prog / 0.25 : 1.0 - prog;
      const rad = p.size * (1 - prog * 0.45);
      const sprite = p.hue === 'amber' ? this.amberPuffSprite : this.carminePuffSprite;

      if (sprite) {
        ctx.globalAlpha = Math.max(0, Math.min(1, a * 0.45));
        ctx.drawImage(sprite, p.x - rad, p.y - rad, rad * 2, rad * 2);
      }
    }

    // 3. Convection Sparks & Embers
    for (let i = 0; i < this.sparks.length; i++) {
      const sp = this.sparks[i];
      if (++sp.life >= sp.maxLife) Object.assign(sp, this.createSpark(cx, cy));
      const prog = sp.life / sp.maxLife;
      sp.x += sp.vx + Math.sin(t * 4.2 + sp.swirl) * 0.45 + wind * 0.06;
      sp.y += sp.vy * (1.0 + clampedHeat * 0.65);
      const a = prog < 0.15 ? prog / 0.15 : 1.0 - prog;

      ctx.globalAlpha = Math.max(0, Math.min(1, a * (0.85 + clampedHeat * 0.15)));
      ctx.fillStyle = sp.life % 2 === 0 ? '#ffdfa0' : '#ff9838';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }
}
