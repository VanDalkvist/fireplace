import type { FlightSpark, HearthWordItem } from "./hearth-word-types";
import { PHRASE_FONT, PHRASE_WARM_FONT, PHRASE_LINE_HEIGHT } from "./hearth-presentation";
const TAU = Math.PI * 2;

function renderSparks(ctx: CanvasRenderingContext2D, sparks: FlightSpark[], now: number): void {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const sp = sparks[i], elapsed = now - sp.born;
    if (elapsed < 0 || elapsed >= sp.duration) { sparks.splice(i, 1); continue; }
    const q = Math.max(0, Math.min(1, elapsed / sp.duration));
    const ease = 1 - Math.pow(1 - q, 3), u = 1 - ease;
    const x = u * u * sp.sx + 2 * u * ease * ((sp.sx + sp.tx) / 2) + ease * ease * sp.tx;
    const y = u * u * sp.sy + 2 * u * ease * (Math.min(sp.sy, sp.ty) - 30) + ease * ease * sp.ty;
    ctx.save();
    ctx.fillStyle = `rgba(255, 178, 102, ${0.85 * (1 - q * 0.7)})`;
    ctx.shadowColor = "#ffb266"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(x, y, 2 * (1 - q * 0.5), 0, TAU); ctx.fill(); ctx.restore();
  }
}

function renderWord(ctx: CanvasRenderingContext2D, word: HearthWordItem, time: number, now: number): void {
  if (!word.settled) {
    word.x += (word.targetX - word.x) * 0.055; word.y += (word.targetY - word.y) * 0.055;
    if (Math.hypot(word.targetX - word.x, word.targetY - word.y) < 1) word.settled = true;
  } else word.y = word.targetY + Math.sin(time * 0.0007 + word.breathOffset) * 0.7;
  const lines = word.lines?.length ? word.lines : [word.text];
  const age = now - (word.lastAt || word.born);
  const warm = age >= 0 && age < 4000 ? Math.min(1, Math.pow(1 - age / 4000, 2)) : 0;
  ctx.save(); ctx.translate(word.x, word.y);
  ctx.font = warm > 0.3 ? PHRASE_WARM_FONT : PHRASE_FONT;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const alpha = Math.max(0.20, Math.min(1, word.opacity));
  ctx.fillStyle = `rgba(${Math.round(236 + 19 * warm)}, ${Math.round(228 - 43 * warm)}, ${Math.round(214 - 99 * warm)}, ${alpha * (0.88 + warm * 0.12)})`;
  ctx.shadowColor = warm > 0.05 ? `rgba(255, 178, 102, ${0.60 * warm})` : "transparent";
  ctx.shadowBlur = warm > 0.05 ? Math.min(6, Math.round(6 * warm)) : 0;
  lines.forEach((line, index) => ctx.fillText(index === lines.length - 1 && word.count > 1 ? `${line} ×${word.count}` : line, 0, -((lines.length - 1) * PHRASE_LINE_HEIGHT) / 2 + index * PHRASE_LINE_HEIGHT));
  ctx.restore();
}

export function renderHearthWords(ctx: CanvasRenderingContext2D, words: HearthWordItem[], sparks: FlightSpark[], time: number): void {
  const now = Date.now();
  renderSparks(ctx, sparks, now);
  for (const word of words) renderWord(ctx, word, time, now);
}
