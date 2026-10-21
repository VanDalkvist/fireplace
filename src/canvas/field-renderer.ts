export interface FieldNode {
  x: number;
  y: number;
  weight: number;
}

export interface TransientSpark {
  seatX: number;
  seatY: number;
  targetX: number;
  targetY: number;
  bornTime: number;
  durationMs: number;
}

export function drawTopologicalIsoclines(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  items: FieldNode[],
  time: number
): void {
  const isoclineCount = 4;
  const baseRadius = 80;

  ctx.save();
  for (let iso = 1; iso <= isoclineCount; iso++) {
    const radius = baseRadius + iso * 42;
    ctx.beginPath();
    const pointsCount = 64;

    for (let p = 0; p <= pointsCount; p++) {
      const theta = (p / pointsCount) * Math.PI * 2;
      let r = radius;

      // Soft proximity warp without sharp edges
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dx = Math.cos(theta) * radius - (item.x - centerX);
        const dy = Math.sin(theta) * radius - (item.y - centerY);
        const dist = Math.hypot(dx, dy);
        const influence = Math.exp(-dist / 140) * (18 * (item.weight || 1));
        r += influence * Math.sin(theta * 2 + time * 0.0012);
      }

      const px = centerX + Math.cos(theta) * r;
      const py = centerY + Math.sin(theta) * r;

      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.strokeStyle =
      iso === 2
        ? "rgba(217, 32, 39, 0.14)" // Subtle AIM signal red
        : `rgba(236, 228, 214, ${0.02 + iso * 0.012})`; // Warm linen
    ctx.lineWidth = iso === 2 ? 1.0 : 0.7;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawTransientSpark(
  ctx: CanvasRenderingContext2D,
  spark: TransientSpark,
  currentTime: number
): boolean {
  const elapsed = currentTime - spark.bornTime;
  if (elapsed >= spark.durationMs) return false;

  const q = elapsed / spark.durationMs;
  const ease = 1 - Math.pow(1 - q, 3);
  const midX = (spark.seatX + spark.targetX) / 2;
  const midY = Math.min(spark.seatY, spark.targetY) - 50;

  const u = 1 - ease;
  const x = u * u * spark.seatX + 2 * u * ease * midX + ease * ease * spark.targetX;
  const y = u * u * spark.seatY + 2 * u * ease * midY + ease * ease * spark.targetY;

  ctx.save();
  ctx.fillStyle = `rgba(255, 178, 102, ${0.85 * (1 - q * 0.7)})`;
  ctx.shadowColor = "#ffb266";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, y, 2.2 * (1 - q * 0.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return true;
}
