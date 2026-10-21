/**
 * Contemplative Isometric Clearing Seat Ring
 * Renders glowing ember participant points without text numbers.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import type { Participant } from '@/domain/types';

const TAU = Math.PI * 2;

export interface IsometricSeat {
  id: number;
  angle: number;
  x: number;
  y: number;
  depth: number;
  pulse: number;
  spokenCount: number;
  hasPassed?: boolean;
}

export class HearthSeatsLayout {
  public seats: IsometricSeat[] = [];

  public layout(cx: number, cy: number, rx: number, ry: number, count = 12): void {
    this.seats = [];
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * TAU + Math.PI / 2;
      const x = cx + Math.cos(ang) * rx;
      const y = cy + Math.sin(ang) * ry;
      const depth = (Math.sin(ang) + 1) / 2;

      this.seats.push({
        id: i + 1,
        angle: ang,
        x,
        y,
        depth,
        pulse: 0,
        spokenCount: 0,
      });
    }
  }

  public syncParticipants(participants: Participant[], activeSpeakerId: number | null): void {
    for (let i = 0; i < this.seats.length; i++) {
      const seat = this.seats[i];
      const p = participants.find((item) => item.id === seat.id);
      if (p) {
        seat.hasPassed = p.hasPassed;
        if (p.id === activeSpeakerId && seat.pulse <= 0.1) {
          seat.pulse = 1.0;
        }
      }
    }
  }

  public pulseSeat(seatId: number): void {
    const s = this.seats.find((item) => item.id === seatId);
    if (s) {
      s.pulse = 1.0;
      s.spokenCount++;
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

    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      const isActive = s.id === activeSpeakerId;
      if (s.pulse > 0) s.pulse -= 0.02;

      const baseR = 3.6 + s.depth * 2.4;

      ctx.beginPath();
      ctx.arc(s.x, s.y, isActive ? baseR + 2 : baseR, 0, TAU);
      ctx.fillStyle = isActive ? '#ffb266' : s.spokenCount > 0 ? '#8a6e52' : '#221912';
      ctx.fill();

      if (isActive) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 178, 102, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, baseR + 7 + Math.sin(t * 3) * 1.2, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      if (s.hasPassed) {
        ctx.fillStyle = '#34281d';
        ctx.beginPath();
        ctx.arc(s.x, s.y - 10, 2.5, 0, TAU);
        ctx.fill();
      }
    }
  }
}
