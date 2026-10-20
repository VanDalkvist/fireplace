import type { ConnectionEdge } from "@/domain/types";

export interface NodePosition {
  x: number;
  y: number;
}

export function drawPresenceEdge(
  ctx: CanvasRenderingContext2D,
  edge: ConnectionEdge,
  sourcePos: NodePosition,
  targetPos: NodePosition,
  time: number
): void {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;

  // Arc curvature offset
  const midX = (sourcePos.x + targetPos.x) / 2;
  const midY = (sourcePos.y + targetPos.y) / 2;
  const normalX = -dy / dist;
  const normalY = dx / dist;

  // Breathing wave modulation
  const wave = Math.sin(time * 0.002 + dist * 0.01) * 12;
  const curveFactor = Math.min(dist * 0.25, 45) + wave;
  const cpX = midX + normalX * curveFactor;
  const cpY = midY + normalY * curveFactor;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sourcePos.x, sourcePos.y);
  ctx.quadraticCurveTo(cpX, cpY, targetPos.x, targetPos.y);

  if (edge.kind === "sequential") {
    // Warm presence thread (amber)
    ctx.strokeStyle = `rgba(255, 178, 102, ${0.35 * edge.strength})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#ffb266";
    ctx.shadowBlur = 6;
  } else {
    // Subtle resonance link (linen)
    ctx.strokeStyle = `rgba(236, 228, 214, ${0.2 * edge.strength})`;
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 4]);
  }

  ctx.stroke();
  ctx.restore();
}
