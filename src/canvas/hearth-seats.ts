/**
 * Contemplative Isometric Clearing Seat Ring
 * Dynamic Emergent Seating: Points manifest organically around the hearth
 * only when voices speak. Zero numbers, zero rigid static grids.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import type { Participant } from '@/domain/types';
import { calculatePhyllotaxisAngle } from '@/domain/session-fsm';

import { renderHearthSeat } from "./hearth-seat-renderer";

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

  public syncParticipants(participants: Participant[], _activeSpeakerId: number | null): void {
    const valid = participants.filter(person => Number.isSafeInteger(person.id) && person.id > 0);
    const activeIds = new Set(valid.map((p) => p.id));
    this.seats = this.seats.filter((s) => activeIds.has(s.id));

    valid.forEach((p, index) => {
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
          pulse: 0, // A participant is neutral until an actual phrase event
          spokenCount: 0,
        };
        this.seats.push(seat);
      }

      seat.hasPassed = p.hasPassed;
    });
  }

  public pulseSeat(seatId: number): void {
    const s = this.seats.find((item) => item.id === seatId);
    if (s) {
      for (const previous of this.seats) if (previous.id !== seatId) {
        previous.pulse = 0; previous.lastSpokenAt = undefined;
      }
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

  public render(ctx: CanvasRenderingContext2D, _activeSpeakerId: number | null, time: number): void {
    const now = Date.now();
    for (const seat of this.seats) renderHearthSeat(ctx, seat, time, now);
  }
}
