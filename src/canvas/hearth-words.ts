/**
 * Contemplative Hearth Words & Conversational Resonance
 * Words settle in the shared clearing ring with sacred fire clearance,
 * 22% conversational gravity, 2.4s provenance tether, and 0.20 opacity floor.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import type { IsometricSeat } from './hearth-seats';
import {
  loadHearthWordsPersistence,
  saveHearthWordsPersistence,
} from '@/infrastructure/salon-persistence';

const TAU = Math.PI * 2;

export interface HearthWordItem {
  id: string; text: string; family: string; seatId: number; width: number;
  x: number; y: number; targetX: number; targetY: number; born: number;
  lastAt: number; count: number; settled: boolean; opacity: number; breathOffset: number;
  relAngle?: number; relRadius?: number;
}

interface FlightSpark {
  sx: number; sy: number; tx: number; ty: number; born: number; duration: number;
}

export class HearthWordsManager {
  public words: HearthWordItem[] = [];
  public flightSparks: FlightSpark[] = [];
  public lastSpokenWord: HearthWordItem | null = null;

  constructor() {
    this.words = loadHearthWordsPersistence();
    if (this.words.length > 0) {
      this.lastSpokenWord = this.words[this.words.length - 1];
    }
  }

  public findSlot(
    speakerAngle: number, wordWidth: number, cx: number, cy: number, rx: number, ry: number
  ): { x: number; y: number } {
    const RADIAL_TIERS = [0.72, 0.44, 0.84, 0.52, 0.78, 0.46, 0.88];
    const halfW = wordWidth / 2;
    let targetBaseAngle = speakerAngle;

    if (this.lastSpokenWord) {
      const dx = this.lastSpokenWord.targetX - cx;
      const dy = this.lastSpokenWord.targetY - cy;
      const prevAngle = Math.atan2(dy / ry, dx / rx);
      let diff = prevAngle - speakerAngle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      targetBaseAngle = speakerAngle + diff * 0.22; // 22% conversational gravity
    }

    const startTier = (this.words.length * 3) % RADIAL_TIERS.length;
    let bestX = cx + Math.cos(targetBaseAngle) * (rx * RADIAL_TIERS[startTier]);
    let bestY = cy + Math.sin(targetBaseAngle) * (ry * RADIAL_TIERS[startTier]);
    let attempts = 0;

    while (attempts < 36) {
      const tierIdx = (startTier + attempts) % RADIAL_TIERS.length;
      const testR = RADIAL_TIERS[tierIdx];
      const shift = attempts === 0 ? 0 : (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * 0.16;
      const testAng = targetBaseAngle + shift;
      let testX = cx + Math.cos(testAng) * (rx * testR);
      let testY = cy + Math.sin(testAng) * (ry * testR);

      // Sacred fire clearance: ensure words clear the central campfire
      const dx = testX - cx;
      const dy = testY - cy;
      const inFlameZone = dy < 75 && dy > -260 && Math.abs(dx) < (155 + halfW);
      if (inFlameZone) {
        const pushR = Math.max(testR, 0.58);
        testX = cx + Math.cos(testAng) * (rx * pushR);
        testY = cy + Math.sin(testAng) * (ry * pushR);
        if (Math.abs(testX - cx) < (160 + halfW) && testY - cy < 75 && testY - cy > -260) {
          testX = cx + (testX >= cx ? 1 : -1) * (162 + halfW);
        }
      }

      let overlaps = false;
      for (let i = 0; i < this.words.length; i++) {
        const w = this.words[i];
        if (Math.abs(testX - w.targetX) < (halfW + w.width / 2 + 28) && Math.abs(testY - w.targetY) < 24) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) { bestX = testX; bestY = testY; break; }
      attempts++;
    }
    return { x: bestX, y: bestY };
  }

  public repositionToViewport(cx: number, cy: number, rx: number, ry: number): void {
    for (let i = 0; i < this.words.length; i++) {
      const w = this.words[i];
      if (w.relAngle !== undefined && w.relRadius !== undefined) {
        w.targetX = cx + Math.cos(w.relAngle) * (rx * w.relRadius);
        w.targetY = cy + Math.sin(w.relAngle) * (ry * w.relRadius);
        if (w.settled) {
          w.x = w.targetX;
          w.y = w.targetY;
        }
      }
    }
  }

  public ageWords(): void {
    for (let i = 0; i < this.words.length; i++) {
      this.words[i].opacity = Math.max(0.20, this.words[i].opacity - 0.02);
    }
    saveHearthWordsPersistence(this.words);
  }

  public addWord(
    id: string, text: string, family: string, speakerSeat: IsometricSeat,
    cx: number, cy: number, rx: number, ry: number, ctx: CanvasRenderingContext2D
  ): void {
    const now = performance.now();
    this.ageWords();
    ctx.font = "20px 'JetBrains Mono'";
    const wordWidth = ctx.measureText(text).width;

    const existing = this.words.find((w) => w.text === text && w.seatId === speakerSeat.id);
    if (existing) {
      existing.count++;
      existing.lastAt = now;
      existing.opacity = 1.0;
      this.recordLink(existing);
      this.lastSpokenWord = existing;
      saveHearthWordsPersistence(this.words);
      return;
    }

    const slot = this.findSlot(speakerSeat.angle, wordWidth, cx, cy, rx, ry);
    const dx = slot.x - cx; const dy = slot.y - cy;
    const relAngle = Math.atan2(dy / ry, dx / rx);
    const relRadius = Math.hypot(dx / rx, dy / ry);

    const item: HearthWordItem = {
      id, text, family, seatId: speakerSeat.id, width: wordWidth,
      x: speakerSeat.x, y: speakerSeat.y, targetX: slot.x, targetY: slot.y,
      born: now, lastAt: now, count: 1, settled: false, opacity: 1.0,
      breathOffset: Math.random() * TAU,
      relAngle, relRadius,
    };

    this.recordLink(item);
    this.words.push(item);
    saveHearthWordsPersistence(this.words);
    this.flightSparks.push({
      sx: speakerSeat.x, sy: speakerSeat.y, tx: slot.x, ty: slot.y,
      born: now, duration: 1200,
    });
    this.lastSpokenWord = item;
  }

  private recordLink(newWord: HearthWordItem): void {
    if (!this.lastSpokenWord || this.lastSpokenWord.id === newWord.id) return;
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const key = 'salon_presence_links';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({
        fromSeat: this.lastSpokenWord.seatId, toSeat: newWord.seatId,
        fromWord: this.lastSpokenWord.text, toWord: newWord.text,
        timestamp: Date.now(),
      });
      if (existing.length > 200) existing.splice(0, existing.length - 200);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (err) {
      console.warn("[HearthWords] Failed to persist link in localStorage:", err);
    }
  }

  public render(ctx: CanvasRenderingContext2D, _seats: IsometricSeat[], time: number): void {
    const t = time * 0.001;
    const now = performance.now();

    // 1. Flight Sparks (Seat -> Word)
    for (let i = this.flightSparks.length - 1; i >= 0; i--) {
      const sp = this.flightSparks[i];
      const elapsed = now - sp.born;
      if (elapsed >= sp.duration) { this.flightSparks.splice(i, 1); continue; }
      const q = elapsed / sp.duration;
      const ease = 1 - Math.pow(1 - q, 3);
      const midX = (sp.sx + sp.tx) / 2;
      const midY = Math.min(sp.sy, sp.ty) - 30;
      const u = 1 - ease;
      const x = u * u * sp.sx + 2 * u * ease * midX + ease * ease * sp.tx;
      const y = u * u * sp.sy + 2 * u * ease * midY + ease * ease * sp.ty;

      ctx.save();
      ctx.fillStyle = `rgba(255, 178, 102, ${0.85 * (1 - q * 0.7)})`;
      ctx.shadowColor = '#ffb266';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, 2.0 * (1 - q * 0.5), 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 2. Words in the Hearth Ring (Pure floating typography, NO visible lines in fire - links stored in data only)
    for (let i = 0; i < this.words.length; i++) {
      const w = this.words[i];

      // Smooth organic deceleration into target slot
      if (!w.settled) {
        const dx = w.targetX - w.x;
        const dy = w.targetY - w.y;
        w.x += dx * 0.055;
        w.y += dy * 0.055;
        if (Math.hypot(dx, dy) < 1.0) w.settled = true;
      } else {
        w.y = w.targetY + Math.sin(t * 0.7 + w.breathOffset) * 0.7;
      }

      ctx.save();
      ctx.translate(w.x, w.y);
      const label = w.count > 1 ? `${w.text} ×${w.count}` : w.text;

      // Warm orange arrival fade to calm linen white over 4.0 seconds (no need to wait for next word!)
      const age = now - (w.lastAt || w.born);
      const warmRatio = age < 4000 ? Math.pow(1.0 - age / 4000, 2) : 0.0;

      ctx.font = warmRatio > 0.3 ? "600 21px 'JetBrains Mono'" : "20px 'JetBrains Mono'";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const alpha = Math.max(0.20, w.opacity);
      const r = Math.round(236 + (255 - 236) * warmRatio);
      const g = Math.round(228 + (185 - 228) * warmRatio);
      const b = Math.round(214 + (115 - 214) * warmRatio);

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * (0.88 + warmRatio * 0.12)})`;
      if (warmRatio > 0.05) {
        ctx.shadowColor = `rgba(255, 178, 102, ${0.60 * warmRatio})`;
        ctx.shadowBlur = Math.round(6 * warmRatio);
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }
}
