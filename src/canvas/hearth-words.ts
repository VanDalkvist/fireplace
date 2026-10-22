/**
 * Contemplative Hearth Words & Conversational Resonance
 * Words settle in the shared clearing ring with sacred fire clearance,
 * 22% conversational gravity, 2.4s provenance tether, and 0.10 opacity floor.
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */

import type { IsometricSeat } from './hearth-seats';

const TAU = Math.PI * 2;

export interface HearthWordItem {
  id: string; text: string; family: string; seatId: number; width: number;
  x: number; y: number; targetX: number; targetY: number; born: number;
  lastAt: number; count: number; settled: boolean; opacity: number; breathOffset: number;
}

interface FlightSpark {
  sx: number; sy: number; tx: number; ty: number; born: number; duration: number;
}

export class HearthWordsManager {
  public words: HearthWordItem[] = [];
  public flightSparks: FlightSpark[] = [];
  public lastSpokenWord: HearthWordItem | null = null;

  public findSlot(
    speakerAngle: number, wordWidth: number, cx: number, cy: number, rx: number, ry: number
  ): { x: number; y: number } {
    const baseR = 0.58;
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

    let bestX = cx + Math.cos(targetBaseAngle) * (rx * baseR);
    let bestY = cy + Math.sin(targetBaseAngle) * (ry * baseR);
    let attempts = 0;

    while (attempts < 28) {
      const shift = attempts === 0 ? 0 : (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * 0.18;
      const testAng = targetBaseAngle + shift;
      const testR = baseR + ((attempts % 3) - 1) * 0.08;
      let testX = cx + Math.cos(testAng) * (rx * testR);
      let testY = cy + Math.sin(testAng) * (ry * testR);

      // Sacred fire clearance
      const distFireX = Math.abs(testX - cx);
      const distFireY = testY - cy;
      if (distFireX < (125 + halfW) && distFireY < 45 && distFireY > -145) {
        testX = cx + (testX >= cx ? 1 : -1) * (135 + halfW);
      }

      let overlaps = false;
      for (let i = 0; i < this.words.length; i++) {
        const w = this.words[i];
        if (Math.abs(testX - w.targetX) < (halfW + w.width / 2 + 18) && Math.abs(testY - w.targetY) < 18) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) { bestX = testX; bestY = testY; break; }
      attempts++;
    }
    return { x: bestX, y: bestY };
  }

  public ageWords(): void {
    for (let i = 0; i < this.words.length; i++) {
      this.words[i].opacity = Math.max(0.10, this.words[i].opacity - 0.02);
    }
  }

  public addWord(
    id: string, text: string, family: string, speakerSeat: IsometricSeat,
    cx: number, cy: number, rx: number, ry: number, ctx: CanvasRenderingContext2D
  ): void {
    const now = performance.now();
    this.ageWords();
    ctx.font = "14px 'JetBrains Mono'";
    const wordWidth = ctx.measureText(text).width;

    const existing = this.words.find((w) => w.text === text && w.seatId === speakerSeat.id);
    if (existing) {
      existing.count++;
      existing.lastAt = now;
      existing.opacity = 1.0;
      this.recordLink(existing);
      this.lastSpokenWord = existing;
      return;
    }

    const slot = this.findSlot(speakerSeat.angle, wordWidth, cx, cy, rx, ry);
    const item: HearthWordItem = {
      id, text, family, seatId: speakerSeat.id, width: wordWidth,
      x: speakerSeat.x, y: speakerSeat.y, targetX: slot.x, targetY: slot.y,
      born: now, lastAt: now, count: 1, settled: false, opacity: 1.0,
      breathOffset: Math.random() * TAU,
    };

    this.recordLink(item);
    this.words.push(item);
    this.flightSparks.push({
      sx: speakerSeat.x, sy: speakerSeat.y, tx: slot.x, ty: slot.y,
      born: now, duration: 1200,
    });
    this.lastSpokenWord = item;
  }

  private recordLink(newWord: HearthWordItem): void {
    if (!this.lastSpokenWord || this.lastSpokenWord.id === newWord.id) return;
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

  public render(ctx: CanvasRenderingContext2D, seats: IsometricSeat[], time: number): void {
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

    // 2. Words in the Hearth Ring
    for (let i = 0; i < this.words.length; i++) {
      const w = this.words[i];
      const speakerSeat = seats.find((s) => s.id === w.seatId);
      const elapsed = now - w.born;

      if (elapsed < 2400 && speakerSeat) {
        const q = 1 - elapsed / 2400;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 178, 102, ${q * 0.16})`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 5]);
        ctx.beginPath();
        ctx.moveTo(speakerSeat.x, speakerSeat.y);
        ctx.lineTo(w.x, w.y);
        ctx.stroke();
        ctx.restore();
      }

      if (!w.settled) {
        w.x += (w.targetX - w.x) * 0.06;
        w.y += (w.targetY - w.y) * 0.06;
        if (Math.hypot(w.targetX - w.x, w.targetY - w.y) < 1.2) w.settled = true;
      } else {
        w.y = w.targetY + Math.sin(t * 0.7 + w.breathOffset) * 0.7;
      }

      ctx.save();
      ctx.translate(w.x, w.y);
      const label = w.count > 1 ? `${w.text} ×${w.count}` : w.text;
      ctx.font = "14px 'JetBrains Mono'";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const isLatest = w === this.lastSpokenWord;
      const alpha = Math.max(0.10, w.opacity);
      if (isLatest) {
        ctx.fillStyle = `rgba(255, 185, 115, ${alpha})`;
        ctx.shadowColor = 'rgba(255, 178, 102, 0.60)';
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = `rgba(236, 228, 214, ${alpha * 0.88})`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 3;
      }
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }
}
