/**
 * Salon Motion Engine: Contemplative Hearth & Word Ring Orchestrator
 * Integrates living flame, isometric seat ring, and resonant words.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import type { FeelingToken, DesireToken, Participant } from '@/domain/types';
import { HearthFlameSimulator } from './hearth-flame';
import { HearthSeatsLayout } from './hearth-seats';
import { HearthWordsManager } from './hearth-words';

const TAU = Math.PI * 2;

export class SalonMotionEngine {
  private flame = new HearthFlameSimulator();
  public seats = new HearthSeatsLayout();
  public words = new HearthWordsManager();

  public cx = 0;
  public floorCY = 0;
  public floorRx = 0;
  public floorRy = 0;

  private knownTokenIds = new Set<string>();

  public resize(width: number, height: number): void {
    this.cx = width / 2;
    this.floorCY = height / 2; // EXACT CENTER!
    this.floorRx = Math.min(width * 0.45, 780);
    this.floorRy = Math.min(height * 0.36, 320);

    this.seats.layout(this.cx, this.floorCY, this.floorRx, this.floorRy, 12);
  }

  public syncTokens(
    feelings: FeelingToken[],
    desires: DesireToken[],
    participants: Participant[],
    activeSpeakerId: number | null,
    width: number,
    height: number,
    ctx: CanvasRenderingContext2D
  ): void {
    if (this.cx === 0 || Math.abs(this.cx - width / 2) > 2) {
      this.resize(width, height);
    }

    this.seats.syncParticipants(participants, activeSpeakerId);

    // Synchronize feelings into hearth ring
    feelings.forEach((token) => {
      if (!this.knownTokenIds.has(token.id)) {
        this.knownTokenIds.add(token.id);
        const speakerSeat = this.seats.seats.find((s) => s.id === token.speakerId) || this.seats.seats[0];
        if (speakerSeat) {
          speakerSeat.pulse = 1.0;
          speakerSeat.spokenCount++;
          this.words.addWord(
            token.id,
            token.lemma || token.text,
            token.family,
            speakerSeat,
            this.cx,
            this.floorCY,
            this.floorRx,
            this.floorRy,
            ctx
          );
        }
      }
    });

    // Synchronize desires into hearth ring (no fly-to-sky, all shared in the circle!)
    desires.forEach((token) => {
      if (!this.knownTokenIds.has(token.id)) {
        this.knownTokenIds.add(token.id);
        const speakerSeat = this.seats.seats.find((s) => s.id === token.speakerId) || this.seats.seats[0];
        if (speakerSeat) {
          speakerSeat.pulse = 1.0;
          speakerSeat.spokenCount++;
          this.words.addWord(
            token.id,
            token.text,
            'желание',
            speakerSeat,
            this.cx,
            this.floorCY,
            this.floorRx,
            this.floorRy,
            ctx
          );
        }
      }
    });
  }

  public getSeatAtPoint(px: number, py: number): number | null {
    return this.seats.getSeatAtPoint(px, py);
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    activeSpeakerId: number | null,
    time: number
  ): void {
    if (this.cx === 0 || Math.abs(this.cx - width / 2) > 2) {
      this.resize(width, height);
    }

    // 1. Dark warm background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // 2. Isometric Clearing Rings on Ground
    ctx.save();
    for (let k = 1; k <= 3; k++) {
      const rx = this.floorRx * (0.35 + k * 0.22);
      const ry = this.floorRy * (0.35 + k * 0.22);
      ctx.strokeStyle = k === 2 ? 'rgba(255, 178, 102, 0.035)' : 'rgba(236, 228, 214, 0.015)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(this.cx, this.floorCY, rx, ry, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Living Contemplative Hearth Flame
    this.flame.render(ctx, this.cx, this.floorCY, time);

    // 4. Seats Ring (Pure glowing ember dots, no text numbers)
    this.seats.render(ctx, activeSpeakerId, time);

    // 5. Shared Hearth Words (Floating typography with provenance tether & decay)
    this.words.render(ctx, this.seats.seats, time);
  }
}
