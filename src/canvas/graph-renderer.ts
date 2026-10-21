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
  const dist = Math.hypot(dx, targetPos.y - sourcePos.y);
  if (dist < 4) return;

  const midX = (sourcePos.x + targetPos.x) / 2;
  // Placid upward silk arch with breathing modulation, no sharp turns
  const arch = Math.min(55, Math.abs(dx) * 0.16 + 18);
  const breath = Math.sin(time * 0.0015 + midX * 0.008) * 6;
  const midY = Math.min(sourcePos.y, targetPos.y) - arch + breath;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sourcePos.x, sourcePos.y);
  ctx.quadraticCurveTo(midX, midY, targetPos.x, targetPos.y);

  if (edge.kind === "sequential") {
    // Warm presence thread (amber silk)
    ctx.strokeStyle = `rgba(255, 178, 102, ${0.45 * edge.strength})`;
    ctx.lineWidth = 1.3;
    ctx.shadowColor = "#ffb266";
    ctx.shadowBlur = 8;
  } else {
    // Subtle resonance link (warm linen)
    ctx.strokeStyle = `rgba(236, 228, 214, ${0.22 * edge.strength})`;
    ctx.lineWidth = 0.9;
    ctx.setLineDash([4, 6]);
  }

  ctx.stroke();
  ctx.restore();
}
