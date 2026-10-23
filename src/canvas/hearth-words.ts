import type { IsometricSeat } from "./hearth-seats";
import type { FlightSpark, HearthViewport, HearthWordItem } from "./hearth-word-types";
import { PHRASE_WARM_FONT, PHRASE_LINE_HEIGHT, FIRE_HALF_WIDTH } from "./hearth-presentation";
import { wrapCanvasText } from "./text-wrapper";
import { findHearthSlot } from "./hearth-word-layout";
import { renderHearthWords } from "./hearth-word-renderer";
import { loadHearthWordsPersistence, saveHearthWordsPersistence, recordHearthLink } from "@/infrastructure/salon-persistence";
export type { HearthWordItem } from "./hearth-word-types";

const TAU = Math.PI * 2;

/** Logical tokens can occupy several lossless five-line display blocks. No I/O beyond the existing word cache. */
export class HearthWordsManager {
  public words: HearthWordItem[] = loadHearthWordsPersistence();
  public flightSparks: FlightSpark[] = [];
  public lastSpokenWord: HearthWordItem | null = this.words.at(-1) ?? null;
  private viewport: HearthViewport = { cx: 500, cy: 300, rx: 400, ry: 200 };

  public findSlot(angle: number, width: number, cx: number, cy: number, rx: number, ry: number, height = PHRASE_LINE_HEIGHT) {
    return findHearthSlot(angle, width, height, { cx, cy, rx, ry }, this.words, this.lastSpokenWord);
  }

  private appendBlocks(source: HearthWordItem, text: string, ctx: CanvasRenderingContext2D): HearthWordItem {
    const v = this.viewport;
    ctx.font = PHRASE_WARM_FONT;
    const wrapped = wrapCanvasText(text, Math.max(1, Math.min(640, v.cx * 2 - 96, Math.max(240, v.cx - FIRE_HALF_WIDTH - 72))), s => ctx.measureText(s).width);
    const sourceId = source.sourceId ?? source.id;
    let first: HearthWordItem | undefined;
    wrapped.blocks.forEach((block, index) => {
      const slot = this.findSlot(source.relAngle ?? 0, block.width, v.cx, v.cy, v.rx, v.ry, block.lines.length * PHRASE_LINE_HEIGHT);
      const item: HearthWordItem = {
        ...source, id: index === 0 ? sourceId : `${sourceId}::${index}`, sourceId, sourceText: text,
        text: block.text, width: block.width, height: block.lines.length * PHRASE_LINE_HEIGHT, lines: block.lines,
        targetX: slot.x, targetY: slot.y,
        relAngle: Math.atan2((slot.y - v.cy) / v.ry, (slot.x - v.cx) / v.rx),
        relRadius: Math.hypot((slot.x - v.cx) / v.rx, (slot.y - v.cy) / v.ry),
      };
      if (item.settled) { item.x = slot.x; item.y = slot.y; }
      this.words.push(item);
      first ??= item;
    });
    if (!first) throw new Error("Cannot display an empty phrase");
    return first;
  }

  private reflow(ctx: CanvasRenderingContext2D): void {
    const sources = new Map<string, HearthWordItem>();
    for (const word of this.words) if (!sources.has(word.sourceId ?? word.id)) sources.set(word.sourceId ?? word.id, word);
    const previousId = this.lastSpokenWord?.sourceId ?? this.lastSpokenWord?.id;
    this.words = []; this.lastSpokenWord = null;
    for (const source of sources.values()) {
      const first = this.appendBlocks(source, source.sourceText ?? source.text, ctx);
      if ((first.sourceId ?? first.id) === previousId) this.lastSpokenWord = first;
    }
    saveHearthWordsPersistence(this.words);
  }

  public repositionToViewport(cx: number, cy: number, rx: number, ry: number, ctx?: CanvasRenderingContext2D): void {
    this.viewport = { cx, cy, rx, ry };
    if (ctx) { this.reflow(ctx); return; }
    for (const word of this.words) {
      if (word.relAngle === undefined || word.relRadius === undefined) continue;
      word.targetX = Math.max(word.width / 2 + 48, Math.min(cx * 2 - word.width / 2 - 48, cx + Math.cos(word.relAngle) * rx * word.relRadius));
      word.targetY = Math.max(48 + (word.height ?? PHRASE_LINE_HEIGHT) / 2, Math.min(cy * 2 - 48 - (word.height ?? PHRASE_LINE_HEIGHT) / 2, cy + Math.sin(word.relAngle) * ry * word.relRadius));
      if (word.settled) { word.x = word.targetX; word.y = word.targetY; }
    }
  }

  public ageWords(): void {
    for (const word of this.words) word.opacity = Math.max(0.20, word.opacity - 0.02);
    saveHearthWordsPersistence(this.words);
  }

  public addWord(id: string, text: string, family: string, seat: IsometricSeat, cx: number, cy: number, rx: number, ry: number, ctx: CanvasRenderingContext2D): void {
    this.viewport = { cx, cy, rx, ry };
    this.ageWords();
    const now = Date.now();
    const existing = this.words.find(word => (word.sourceText ?? word.text) === text && word.seatId === seat.id);
    if (existing) {
      for (const word of this.words.filter(word => (word.sourceId ?? word.id) === (existing.sourceId ?? existing.id))) {
        word.count++; word.lastAt = now; word.opacity = 1;
      }
      this.recordLink(existing); this.lastSpokenWord = existing;
      saveHearthWordsPersistence(this.words); return;
    }
    const first = this.appendBlocks({
      id, text, family, seatId: seat.id, width: 0, x: seat.x, y: seat.y, targetX: seat.x, targetY: seat.y,
      born: now, lastAt: now, count: 1, settled: false, opacity: 1, breathOffset: Math.random() * TAU,
      relAngle: seat.angle,
    }, text, ctx);
    this.recordLink(first); this.lastSpokenWord = first;
    this.flightSparks.push({ sx: seat.x, sy: seat.y, tx: first.targetX, ty: first.targetY, born: now, duration: 1200 });
    saveHearthWordsPersistence(this.words);
  }

  private recordLink(word: HearthWordItem): void {
    const previous = this.lastSpokenWord;
    if (previous && previous.id !== word.id) recordHearthLink(previous.seatId, word.seatId, previous.sourceText ?? previous.text, word.sourceText ?? word.text);
  }

  public updateWordText(id: string, text: string, family?: string, ctx?: CanvasRenderingContext2D): void {
    const source = this.words.find(word => word.id === id || word.sourceId === id);
    if (!source) return;
    source.sourceText = text; source.text = text; source.lastAt = Date.now();
    if (family) source.family = family;
    if (ctx) this.reflow(ctx);
    else { source.lines = undefined; saveHearthWordsPersistence(this.words); }
  }

  public render(ctx: CanvasRenderingContext2D, _seats: IsometricSeat[], time: number): void {
    renderHearthWords(ctx, this.words, this.flightSparks, time);
  }
}
