import type { HearthFlameSimulator } from "./hearth-flame";
import { HEARTH_SCALE } from "./hearth-presentation";
export function renderScaledHearth(ctx: CanvasRenderingContext2D, flame: Pick<HearthFlameSimulator, "render">, cx: number, cy: number, time: number, heat: number): void {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(HEARTH_SCALE, HEARTH_SCALE); ctx.translate(-cx, -cy);
  try { flame.render(ctx, cx, cy, time, heat); } finally { ctx.restore(); }
}
