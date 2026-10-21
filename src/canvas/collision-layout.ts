export interface BoxItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function separateBoxes(
  a: BoxItem,
  b: BoxItem,
  pad: number,
  k = 0.22
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ox = (a.w + b.w) / 2 + pad - Math.abs(dx);
  const oy = (a.h + b.h) / 2 + pad * 0.4 - Math.abs(dy);
  if (ox <= 0 || oy <= 0) return;
  if (ox / (a.w + b.w) < oy / (a.h + b.h)) {
    const s = (dx >= 0 ? 1 : -1) * ox * k;
    a.x -= s;
    b.x += s;
  } else {
    const s = (dy >= 0 ? 1 : -1) * oy * k;
    a.y -= s;
    b.y += s;
  }
}
