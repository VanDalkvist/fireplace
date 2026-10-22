/**
 * Contemplative Isometric Clearing Seat Ring
 * Dynamic Emergent Seating: Points manifest organically around the hearth
 * only when voices speak. Zero numbers, zero rigid static grids.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import type { Participant } from '@/domain/types';
import { calculatePhyllotaxisAngle } from '@/domain/session-fsm';

const TAU = Math.PI * 2;

export interface IsometricSeat {
  id: number;
  angle: number;
  x: number;
  y: number;
  depth: number;
  pulse: number;
  spokenCount: number;
  lastSpokenAt?: number;
  hasPassed?: boolean;
}

export class HearthSeatsLayout {
  public seats: IsometricSeat[] = [];
  private cx = 0;
  private cy = 0;
  private rx = 0;
  private ry = 0;

  public layout(cx: number, cy: number, rx: number, ry: number, _count = 0): void {
    this.cx = cx;
    this.cy = cy;
    this.rx = rx;
    this.ry = ry;

    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      s.x = this.cx + Math.cos(s.angle) * this.rx;
      s.y = this.cy + Math.sin(s.angle) * this.ry;
      s.depth = (Math.sin(s.angle) + 1) / 2;
    }
  }

  public syncParticipants(participants: Participant[], activeSpeakerId: number | null): void {
    const activeIds = new Set(participants.map((p) => p.id));
    this.seats = this.seats.filter((s) => activeIds.has(s.id));

    participants.forEach((p, index) => {
      let seat = this.seats.find((s) => s.id === p.id);
      if (!seat) {
        // Natural phyllotaxis distribution around the clearing
        const ang = p.angle ?? calculatePhyllotaxisAngle(index);
        const x = this.cx + Math.cos(ang) * this.rx;
        const y = this.cy + Math.sin(ang) * this.ry;
        const depth = (Math.sin(ang) + 1) / 2;

        seat = {
          id: p.id,
          angle: ang,
          x,
          y,
          depth,
          pulse: 1.0, // Soft warm birth pulse
          spokenCount: 0,
        };
        this.seats.push(seat);
      }

      seat.hasPassed = p.hasPassed;
      if (p.id === activeSpeakerId && seat.pulse <= 0.1) {
        seat.pulse = 1.0;
      }
    });
  }

  public pulseSeat(seatId: number): void {
    const s = this.seats.find((item) => item.id === seatId);
    if (s) {
      s.pulse = 1.0;
      s.spokenCount++;
      s.lastSpokenAt = Date.now();
    }
  }

  public getSeatAtPoint(px: number, py: number): number | null {
    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      if (Math.hypot(px - s.x, py - s.y) < 28) {
        return s.id;
      }
    }
    return null;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    activeSpeakerId: number | null,
    time: number
  ): void {
    const t = time * 0.001;
    const now = Date.now();

    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      const timeSinceSpoken = s.lastSpokenAt ? now - s.lastSpokenAt : Infinity;
      const isPostSpeechDecay = timeSinceSpoken >= 0 && timeSinceSpoken <= 5000;
      const decayProgress = isPostSpeechDecay ? Math.max(0, Math.min(1, timeSinceSpoken / 5000)) : 1.0;
      const pulseDecay = isPostSpeechDecay ? (1.0 - decayProgress) : 0.0;

      const isSpeakingNow = s.id === activeSpeakerId && !isPostSpeechDecay;
      const baseR = 4.0 + s.depth * 2.2;

      ctx.save();

      if (isPostSpeechDecay) {
        // Grand pulsating breathing ring expanding outwards and fading over 5 seconds
        const pulseWave = Math.sin(t * 5.5) * 0.5 + 0.5;
        const outerR = Math.max(baseR, baseR + (14 + pulseWave * 5) * pulseDecay);
        const glowR = Math.max(outerR + 1, outerR + 8 * pulseDecay);

        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        grad.addColorStop(0, `rgba(255, 178, 102, ${0.55 * pulseDecay})`);
        grad.addColorStop(0.55, `rgba(235, 120, 45, ${0.25 * pulseDecay})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, TAU);
        ctx.fill();

        // Pulsating outer aura ring
        ctx.strokeStyle = `rgba(255, 195, 115, ${0.75 * pulseDecay})`;
        ctx.lineWidth = Math.max(0.5, 1.8 * pulseDecay);
        ctx.beginPath();
        ctx.arc(s.x, s.y, outerR, 0, TAU);
        ctx.stroke();
      } else if (isSpeakingNow) {
        // Continuous subtle breathing while currently listening
        const glowR = baseR + 10 + Math.sin(t * 3) * 2;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        grad.addColorStop(0, 'rgba(255, 178, 102, 0.45)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 178, 102, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, baseR + 6 + Math.sin(t * 2.5) * 1.5, 0, TAU);
        ctx.stroke();
      } else {
        // Calm resting glow
        const glowR = baseR + 4;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        grad.addColorStop(0, 'rgba(180, 120, 80, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, TAU);
        ctx.fill();
      }

      // Living core ember
      const coreR = isPostSpeechDecay ? baseR + 2.0 * pulseDecay : (isSpeakingNow ? baseR + 1.5 : baseR);
      ctx.beginPath();
      ctx.arc(s.x, s.y, coreR, 0, TAU);
      if (isPostSpeechDecay) {
        const r = Math.round(184 + (255 - 184) * pulseDecay);
        const g = Math.round(137 + (178 - 137) * pulseDecay);
        const b = Math.round(91 + (102 - 91) * pulseDecay);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      } else if (isSpeakingNow) {
        ctx.fillStyle = '#ffb266';
      } else {
        ctx.fillStyle = s.spokenCount > 0 ? '#b8895b' : '#543d2c';
      }
      ctx.fill();

      ctx.restore();
    }
  }
}
