/**
 * Salon Motion Engine: Contemplative Hearth & Word Ring Orchestrator
 * Integrates living flame, isometric seat ring, and resonant words.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import type { FeelingToken, DesireToken, Participant } from '@/domain/types';
import { HearthFlameSimulator } from './hearth-flame';
import { HearthSeatsLayout } from './hearth-seats';
import { HearthWordsManager } from './hearth-words';
import {
  clearAllSalonPersistence,
  loadSessionPersistence,
  updatePersistedHeat,
} from '@/infrastructure/salon-persistence';

const TAU = Math.PI * 2;

export class SalonMotionEngine {
  private flame = new HearthFlameSimulator();
  public seats = new HearthSeatsLayout();
  public words = new HearthWordsManager();

  public cx = 0;
  public floorCY = 0;
  public floorRx = 0;
  public floorRy = 0;
  public currentHeat = 0.0;

  private knownTokenIds = new Set<string>();

  constructor() {
    const persisted = loadSessionPersistence();
    if (persisted) {
      this.currentHeat = persisted.heat || 0.0;
      persisted.session.feelings?.forEach((f) => this.knownTokenIds.add(f.id));
      persisted.session.desires?.forEach((d) => this.knownTokenIds.add(d.id));
    }
  }

  public computeTargetHeat(wordCount: number, isSpeaking: boolean): number {
    const wordContribution = wordCount > 0 ? (1.0 - Math.exp(-wordCount / 14)) * 0.92 : 0.0;
    const speechBoost = isSpeaking ? 0.12 : 0.0;
    return Math.min(1.0, wordContribution + speechBoost);
  }

  public resize(width: number, height: number): void {
    this.cx = width / 2;
    this.floorCY = height / 2; // EXACT CENTER!
    this.floorRx = Math.min(width * 0.48, 920);
    this.floorRy = Math.min(height * 0.40, 420);

    this.seats.layout(this.cx, this.floorCY, this.floorRx, this.floorRy, 12);
    this.words.repositionToViewport(this.cx, this.floorCY, this.floorRx, this.floorRy);
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

    // If session was reset, clear active floating words and token cache
    if (feelings.length === 0 && desires.length === 0 && this.knownTokenIds.size > 0) {
      this.knownTokenIds.clear();
      this.words.words = [];
      this.currentHeat = 0.0;
      clearAllSalonPersistence();
    }

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

    // 3. Living Contemplative Hearth Flame (Ignited by accumulated words heat)
    const isSpeaking = activeSpeakerId !== null || this.words.flightSparks.length > 0;
    const targetHeat = this.computeTargetHeat(this.words.words.length, isSpeaking);
    this.currentHeat += (targetHeat - this.currentHeat) * 0.035;
    if (Math.round(time) % 60 === 0) {
      updatePersistedHeat(this.currentHeat);
    }

    this.flame.render(ctx, this.cx, this.floorCY, time, this.currentHeat);

    // 4. Seats Ring (Pure glowing ember dots, no text numbers)
    this.seats.render(ctx, activeSpeakerId, time);

    // 5. Shared Hearth Words (Floating typography with provenance tether & decay)
    this.words.render(ctx, this.seats.seats, time);
  }
}
