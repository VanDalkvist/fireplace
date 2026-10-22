export interface Log {
  a: number;
  len: number;
  w: number;
  heatPhase: number;
  speed: number;
}

export interface Tongue {
  relX: number;
  relY: number;
  width: number;
  baseH: number;
  speed: number;
  phase: number;
  layer: "core" | "body" | "mantle";
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
  { a: -0.65, len: 144, w: 13.5, heatPhase: 0.0, speed: 1.6 },
  { a: 0.85,  len: 138, w: 13.0, heatPhase: 2.1, speed: 2.0 },
  { a: 2.35,  len: 150, w: 14.0, heatPhase: 4.2, speed: 1.4 },
  { a: 3.85,  len: 135, w: 13.0, heatPhase: 1.3, speed: 1.8 },
];

export function buildTongues(): Tongue[] {
  const t: Tongue[] = [
    { relX: -16, relY: -4, width: 36, baseH: 235, speed: 1.6, phase: 0.2, layer: "core" },
    { relX: 5,   relY: 3,  width: 38, baseH: 250, speed: 1.8, phase: 2.1, layer: "core" },
    { relX: 24,  relY: -5, width: 30, baseH: 215, speed: 2.0, phase: 4.3, layer: "core" },
    { relX: -34, relY: 1,  width: 28, baseH: 195, speed: 1.9, phase: 5.7, layer: "core" },
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
    });
  }
  return t;
}
