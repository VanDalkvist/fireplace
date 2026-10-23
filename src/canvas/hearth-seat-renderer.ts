import type { IsometricSeat } from "./hearth-seats";
import { seatAccent } from "./seat-accent";
const TAU = Math.PI * 2;

function accent(ctx: CanvasRenderingContext2D, seat: IsometricSeat, base: number, strength: number, t: number): void {
  const wave = Math.sin(t * 5.5) * 0.5 + 0.5;
  const outer = base + (14 + wave * 5) * strength, glow = outer + 8 * strength;
  const gradient = ctx.createRadialGradient(seat.x, seat.y, 0, seat.x, seat.y, glow);
  gradient.addColorStop(0, `rgba(255, 178, 102, ${0.55 * strength})`);
  gradient.addColorStop(0.55, `rgba(235, 120, 45, ${0.25 * strength})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(seat.x, seat.y, glow, 0, TAU); ctx.fill();
  ctx.strokeStyle = `rgba(255, 195, 115, ${0.75 * strength})`;
  ctx.lineWidth = Math.max(0.5, 1.8 * strength);
  ctx.beginPath(); ctx.arc(seat.x, seat.y, outer, 0, TAU); ctx.stroke();
}

function rest(ctx: CanvasRenderingContext2D, seat: IsometricSeat, base: number): void {
  const gradient = ctx.createRadialGradient(seat.x, seat.y, 0, seat.x, seat.y, base + 4);
  gradient.addColorStop(0, "rgba(180, 120, 80, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(seat.x, seat.y, base + 4, 0, TAU); ctx.fill();
}

export function renderHearthSeat(ctx: CanvasRenderingContext2D, seat: IsometricSeat, time: number, now: number): void {
  const strength = seatAccent(seat.lastSpokenAt, now), base = 4 + seat.depth * 2.2;
  ctx.save();
  if (strength > 0) accent(ctx, seat, base, strength, time * 0.001);
  else rest(ctx, seat, base);
  ctx.beginPath(); ctx.arc(seat.x, seat.y, base + 2 * strength, 0, TAU);
  ctx.fillStyle = strength > 0
    ? `rgb(${Math.round(184 + 71 * strength)}, ${Math.round(137 + 41 * strength)}, ${Math.round(91 + 11 * strength)})`
    : "#b8895b";
  ctx.fill(); ctx.restore();
}
