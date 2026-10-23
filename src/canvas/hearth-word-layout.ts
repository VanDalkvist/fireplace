import type { HearthViewport, HearthWordItem } from "./hearth-word-types";

import { FIRE_HALF_WIDTH, FIRE_ABOVE, FIRE_BELOW, PHRASE_LINE_HEIGHT } from "./hearth-presentation";

const TIERS = [0.72, 0.44, 0.84, 0.52, 0.78, 0.46, 0.88];
const PAD = 48;

function constrain(x: number, y: number, width: number, height: number, v: HearthViewport) {
  const dx = x - v.cx, dy = y - v.cy;
  if (dy < FIRE_BELOW + height / 2 && dy > -FIRE_ABOVE - height / 2 && Math.abs(dx) < FIRE_HALF_WIDTH + width / 2) {
    x = v.cx + (dx >= 0 ? 1 : -1) * (FIRE_HALF_WIDTH + 2 + width / 2);
  }
  x = Math.max(width / 2 + PAD, Math.min(v.cx * 2 - width / 2 - PAD, x));
  const minY = height / 2 + PAD, maxY = v.cy * 2 - height / 2 - PAD;
  y = Math.max(minY, Math.min(maxY, y));
  if (Math.abs(x - v.cx) < FIRE_HALF_WIDTH + width / 2 && y - v.cy < FIRE_BELOW + height / 2 && y - v.cy > -FIRE_ABOVE - height / 2) {
    const below = v.cy + FIRE_BELOW + height / 2 + 24;
    const above = v.cy - FIRE_ABOVE - height / 2 - 24;
    y = below <= maxY ? below : Math.max(minY, above);
  }
  return { x, y };
}

export function findHearthSlot(
  angle: number, width: number, height: number, v: HearthViewport,
  words: HearthWordItem[], previous: HearthWordItem | null,
): { x: number; y: number } {
  if (previous) {
    const priorAngle = Math.atan2((previous.targetY - v.cy) / v.ry, (previous.targetX - v.cx) / v.rx);
    angle += Math.atan2(Math.sin(priorAngle - angle), Math.cos(priorAngle - angle)) * 0.22;
  }
  const start = (words.length * 3) % TIERS.length;
  let candidate = constrain(v.cx + Math.cos(angle) * v.rx * TIERS[start], v.cy + Math.sin(angle) * v.ry * TIERS[start], width, height, v);
  for (let attempt = 0; attempt < 36; attempt++) {
    const radius = TIERS[(start + attempt) % TIERS.length];
    const shift = attempt === 0 ? 0 : (attempt % 2 === 0 ? 1 : -1) * Math.ceil(attempt / 2) * 0.16;
    const next = constrain(v.cx + Math.cos(angle + shift) * v.rx * radius, v.cy + Math.sin(angle + shift) * v.ry * radius, width, height, v);
    if (!words.some(w => Math.abs(next.x - w.targetX) < (width + w.width) / 2 + 28 && Math.abs(next.y - w.targetY) < (height + (w.height ?? PHRASE_LINE_HEIGHT)) / 2 + 16)) {
      candidate = next;
      break;
    }
  }
  return candidate;
}
