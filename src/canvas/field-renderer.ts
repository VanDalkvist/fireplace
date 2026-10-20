export interface FieldNode {
  x: number;
  y: number;
  weight: number;
}

export function drawTopologicalIsoclines(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  items: FieldNode[],
  time: number
): void {
  const isoclineCount = 5;
  const baseRadius = 70;

  ctx.save();
  for (let iso = 1; iso <= isoclineCount; iso++) {
    const radius = baseRadius + iso * 38;
    ctx.beginPath();
    const pointsCount = 64;

    for (let p = 0; p <= pointsCount; p++) {
      const theta = (p / pointsCount) * Math.PI * 2;
      let r = radius;

      // Warp contour according to proximity to word masses
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dx = Math.cos(theta) * radius - (item.x - centerX);
        const dy = Math.sin(theta) * radius - (item.y - centerY);
        const dist = Math.hypot(dx, dy);
        const influence = Math.exp(-dist / 130) * (22 * (item.weight || 1));
        r += influence * Math.sin(theta * 2 + time * 0.0015);
      }

      const px = centerX + Math.cos(theta) * r;
      const py = centerY + Math.sin(theta) * r;

      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.strokeStyle =
      iso === 3
        ? "rgba(217, 32, 39, 0.18)" // Signature AIM red isocline
        : `rgba(236, 228, 214, ${0.02 + iso * 0.015})`; // Warm linen contours
    ctx.lineWidth = iso === 3 ? 1.2 : 0.75;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSeatPresenceRay(
  ctx: CanvasRenderingContext2D,
  seatX: number,
  seatY: number,
  targetX: number,
  targetY: number,
  intensity: number
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(seatX, seatY);
  ctx.lineTo(targetX, targetY);
  ctx.strokeStyle = `rgba(217, 32, 39, ${0.12 * Math.min(1.5, intensity)})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.stroke();
  ctx.restore();
}
