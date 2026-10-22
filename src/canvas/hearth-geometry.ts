export interface LogFissure {
  u1: number;
  u2: number;
  offY: number;
  w: number;
}

export interface Log {
  a: number;
  len: number;
  w: number;
  heatPhase: number;
  speed: number;
  fissures: LogFissure[];
}

export interface Tongue {
  relX: number;
  relY: number;
  width: number;
  baseH: number;
  speed: number;
  phase: number;
  layer: "core" | "body" | "mantle";
  curlFreq: number;
  asymmetry: number;
}

export interface Stone {
  ang: number;
  dr: number;
  w: number;
  h: number;
  rot: number;
  shade: string;
}

export const HEARTH_STONES: Stone[] = [
  { ang: 0.08, dr: 3,  w: 19, h: 11, rot: 0.12,  shade: "#201813" },
  { ang: 0.46, dr: -4, w: 14, h: 9,  rot: 0.28,  shade: "#18120e" },
  { ang: 0.84, dr: 5,  w: 20, h: 12, rot: -0.18, shade: "#251d17" },
  { ang: 1.26, dr: -3, w: 15, h: 9,  rot: 0.14,  shade: "#1b1410" },
  { ang: 1.64, dr: 4,  w: 22, h: 12, rot: 0.02,  shade: "#231a15" },
  { ang: 2.04, dr: -5, w: 13, h: 8,  rot: -0.25, shade: "#16110d" },
  { ang: 2.42, dr: 3,  w: 18, h: 10, rot: 0.18,  shade: "#211914" },
  { ang: 2.82, dr: -3, w: 15, h: 9,  rot: -0.12, shade: "#1a130f" },
  { ang: 3.20, dr: 4,  w: 20, h: 11, rot: 0.06,  shade: "#241c16" },
  { ang: 3.60, dr: -4, w: 14, h: 8,  rot: 0.22,  shade: "#17110d" },
  { ang: 4.00, dr: 3,  w: 18, h: 10, rot: -0.16, shade: "#221a15" },
  { ang: 4.40, dr: -3, w: 15, h: 9,  rot: 0.12,  shade: "#19130f" },
  { ang: 4.78, dr: 5,  w: 22, h: 12, rot: -0.08, shade: "#261e18" },
  { ang: 5.18, dr: -5, w: 13, h: 8,  rot: 0.26,  shade: "#16110d" },
  { ang: 5.56, dr: 3,  w: 17, h: 10, rot: -0.14, shade: "#1f1813" },
  { ang: 5.94, dr: -2, w: 15, h: 9,  rot: 0.18,  shade: "#1a130f" },
];

export const LOGS: Log[] = [
  {
    a: -0.65, len: 144, w: 13.5, heatPhase: 0.0, speed: 1.6,
    fissures: [
      { u1: -0.35, u2: 0.15, offY: -2.0, w: 2.8 },
      { u1: -0.10, u2: 0.40, offY: 2.2, w: 2.2 },
      { u1: -0.22, u2: 0.22, offY: 0.0, w: 3.4 },
    ],
  },
  {
    a: 0.85, len: 138, w: 13.0, heatPhase: 2.1, speed: 2.0,
    fissures: [
      { u1: -0.40, u2: 0.10, offY: 2.0, w: 2.5 },
      { u1: -0.15, u2: 0.35, offY: -1.8, w: 2.2 },
      { u1: -0.25, u2: 0.28, offY: 0.5, w: 3.0 },
    ],
  },
  {
    a: 2.35, len: 150, w: 14.0, heatPhase: 4.2, speed: 1.4,
    fissures: [
      { u1: -0.32, u2: 0.25, offY: -2.4, w: 3.2 },
      { u1: -0.15, u2: 0.42, offY: 1.6, w: 2.4 },
      { u1: -0.38, u2: 0.12, offY: 0.2, w: 2.8 },
    ],
  },
  {
    a: 3.85, len: 135, w: 13.0, heatPhase: 1.3, speed: 1.8,
    fissures: [
      { u1: -0.30, u2: 0.20, offY: 1.8, w: 2.6 },
      { u1: -0.12, u2: 0.38, offY: -2.0, w: 2.1 },
      { u1: -0.22, u2: 0.30, offY: 0.0, w: 3.1 },
    ],
  },
];

export function buildTongues(): Tongue[] {
  const t: Tongue[] = [
    { relX: -16, relY: -4, width: 36, baseH: 235, speed: 1.6, phase: 0.2, layer: "core", curlFreq: 2.8, asymmetry: -0.25 },
    { relX: 5,   relY: 3,  width: 38, baseH: 250, speed: 1.8, phase: 2.1, layer: "core", curlFreq: 3.1, asymmetry: 0.22 },
    { relX: 24,  relY: -5, width: 30, baseH: 215, speed: 2.0, phase: 4.3, layer: "core", curlFreq: 2.6, asymmetry: 0.35 },
    { relX: -34, relY: 1,  width: 28, baseH: 195, speed: 1.9, phase: 5.7, layer: "core", curlFreq: 3.4, asymmetry: -0.32 },
  ];
  for (let i = 0; i < 12; i++) {
    const cx = ((i % 3) - 1) * 32 + ((i % 2 === 0 ? 1 : -1) * 8);
    t.push({
      relX: cx,
      relY: Math.sin(i * 1.9) * 8 - 1,
      width: 22 + (i % 3) * 7,
      baseH: 110 + (i % 4) * 15,
      speed: 2.1 + (i % 4) * 0.28,
      phase: i * 0.72 + 1.1,
      layer: "body",
      curlFreq: 2.5 + (i % 3) * 0.6,
      asymmetry: ((i % 2 === 0 ? 1 : -1) * 0.28),
    });
  }
  for (let i = 0; i < 22; i++) {
    const cx = ((i % 5) - 2) * 20 + Math.sin(i * 2.3) * 14;
    t.push({
      relX: cx,
      relY: Math.cos(i * 1.7) * 9,
      width: 14 + (i % 3) * 4,
      baseH: 55 + (i % 4) * 11,
      speed: 2.5 + (i % 3) * 0.45,
      phase: i * 0.51 + 2.4,
      layer: "mantle",
      curlFreq: 3.2 + (i % 4) * 0.5,
      asymmetry: Math.sin(i * 1.8) * 0.45,
    });
  }
  for (let i = 0; i < 16; i++) {
    const cx = ((i % 4) - 1.5) * 24 + Math.sin(i * 3.1) * 16;
    t.push({
      relX: cx,
      relY: Math.cos(i * 2.7) * 7 + 2,
      width: 10 + (i % 3) * 3,
      baseH: 25 + (i % 3) * 7,
      speed: 3.2 + (i % 4) * 0.5,
      phase: i * 0.83 + 0.5,
      layer: "mantle",
      curlFreq: 4.1 + (i % 3) * 0.7,
      asymmetry: Math.cos(i * 2.1) * 0.4,
    });
  }
  return t;
}

const TAU = Math.PI * 2;

export function drawHearthStone(
  ctx: CanvasRenderingContext2D,
  st: Stone,
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  t: number,
  clampedHeat: number
): void {
  const rot = st.rot + Math.atan2(sy - cy, sx - cx) + Math.PI / 2;
  ctx.fillStyle = st.shade;
  ctx.beginPath();
  ctx.ellipse(sx, sy, st.w * 0.5, st.h * 0.5, rot, 0, TAU);
  ctx.fill();

  // Fire-facing warm facet highlight with dancing flicker (additive lighting)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const toFire = Math.atan2(cy - sy, cx - sx);
  const stoneFlicker = Math.sin(t * 3.8 + st.ang * 2.5) * 0.08;
  const hx = sx + Math.cos(toFire) * (st.w * 0.24);
  const hy = sy + Math.sin(toFire) * (st.h * 0.24);
  const hlGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, st.w * 0.52);
  const hlAlpha = Math.max(0.1, 0.36 + clampedHeat * 0.28 + stoneFlicker);
  hlGrad.addColorStop(0, `rgba(255, 225, 135, ${hlAlpha})`);
  hlGrad.addColorStop(0.45, `rgba(240, 120, 40, ${hlAlpha * 0.65})`);
  hlGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  ctx.ellipse(hx, hy, st.w * 0.4, st.h * 0.4, rot, 0, TAU);
  ctx.fill();

  // Glowing specular rim on top edge facing the flames
  ctx.strokeStyle = `rgba(255, 215, 120, ${0.35 + clampedHeat * 0.25 + stoneFlicker * 0.5})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.ellipse(sx, sy, st.w * 0.46, st.h * 0.46, rot, toFire - 0.75, toFire + 0.75);
  ctx.stroke();
  ctx.restore();
}
