import type { FeelingToken, DesireToken, ConnectionEdge, Participant } from "@/domain/types";
import { drawPresenceEdge, type NodePosition } from "./graph-renderer";
import { drawTopologicalIsoclines, drawTransientSpark, type TransientSpark } from "./field-renderer";
import { separateBoxes, type BoxItem } from "./collision-layout";

export interface MotionItem extends BoxItem {
  token: FeelingToken;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  scale: number;
  pulse: number;
  seed: number;
}

export interface LanternItem extends BoxItem {
  token: DesireToken;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  settled: boolean;
}

const FAMILIES = [
  "спокойствие", "нежность", "радость", "живость", "интерес",
  "тело", "усталость", "грусть", "растерянность", "стыд", "страх", "тревога", "злость"
];

export class SalonMotionEngine {
  private items: Map<string, MotionItem> = new Map();
  private lanterns: Map<string, LanternItem> = new Map();
  private sparks: TransientSpark[] = [];

  public syncTokens(
    feelings: FeelingToken[],
    desires: DesireToken[],
    participants: Participant[],
    width: number,
    height: number
  ): void {
    const cx = width / 2;
    const cy = height * 0.52;
    const rx = Math.min(width * 0.36, 420);
    const ry = Math.min(height * 0.26, 260);

    const getSeatPos = (speakerId: number): NodePosition => {
      const idx = participants.findIndex((p) => p.id === speakerId);
      const total = participants.length || 12;
      const angle = (idx >= 0 ? idx : 0) * ((2 * Math.PI) / total) - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * (rx * 1.05),
        y: cy + Math.sin(angle) * (ry * 1.05),
      };
    };

    feelings.forEach((token) => {
      if (!this.items.has(token.id)) {
        const origin = getSeatPos(token.speakerId);
        const fIdx = FAMILIES.indexOf(token.family);
        const a = fIdx >= 0 ? -Math.PI / 2 + (fIdx * 2 * Math.PI) / FAMILIES.length : Math.random() * Math.PI * 2;
        const distR = 0.25 + Math.random() * 0.35;
        const tx = cx + Math.cos(a) * (rx * distR);
        const ty = cy + Math.sin(a) * (ry * distR);
        const w = token.lemma.length * 8.5 + 24;

        this.items.set(token.id, {
          token,
          x: origin.x,
          y: origin.y,
          vx: 0,
          vy: 0,
          targetX: tx,
          targetY: ty,
          w,
          h: 24,
          scale: 0.3,
          pulse: 1.0,
          seed: Math.random() * 100,
        });

        this.sparks.push({
          seatX: origin.x,
          seatY: origin.y,
          targetX: tx,
          targetY: ty,
          bornTime: performance.now(),
          durationMs: 1400,
        });
      }
    });

    const frac = (v: number) => v - Math.floor(v);
    const skyTop = Math.max(60, height * 0.07);
    const skyH = Math.min(180, height * 0.16);

    desires.forEach((token) => {
      if (!this.lanterns.has(token.id)) {
        const origin = getSeatPos(token.speakerId);
        const k = this.lanterns.size;
        const tx = width * (0.12 + 0.76 * frac(0.31 + k * 0.618034));
        const ty = skyTop + skyH * frac(0.35 + k * 0.381966);
        const w = (token.text.length + 2) * 8.5 + 28;

        this.lanterns.set(token.id, {
          token,
          x: origin.x,
          y: origin.y,
          vx: (tx - origin.x) * 0.02,
          vy: -2.5,
          targetX: tx,
          targetY: ty,
          w,
          h: 24,
          settled: false,
        });
      }
    });
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    edges: ConnectionEdge[],
    time: number
  ): void {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height * 0.52;

    const fieldNodes = Array.from(this.items.values()).map((it) => ({
      x: it.x,
      y: it.y,
      weight: it.token.intensity,
    }));
    drawTopologicalIsoclines(ctx, cx, cy, fieldNodes, time);

    const now = performance.now();
    this.sparks = this.sparks.filter((sp) => drawTransientSpark(ctx, sp, now));

    edges.forEach((edge) => {
      const src = this.items.get(edge.sourceTokenId);
      const tgt = this.items.get(edge.targetTokenId);
      if (src && tgt) {
        drawPresenceEdge(ctx, edge, { x: src.x, y: src.y }, { x: tgt.x, y: tgt.y }, time);
      }
    });

    const itemList = Array.from(this.items.values());
    itemList.forEach((item) => {
      const k = 0.035;
      const damp = 0.86;
      const driftX = Math.sin(time * 0.001 + item.seed) * 0.4;
      const driftY = Math.cos(time * 0.0008 + item.seed * 1.5) * 0.4;
      item.vx = (item.vx + (item.targetX - item.x) * k + driftX) * damp;
      item.vy = (item.vy + (item.targetY - item.y) * k + driftY) * damp;
      item.x += item.vx;
      item.y += item.vy;
      item.scale += (1.0 - item.scale) * 0.08;
    });

    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < itemList.length; i++) {
        for (let j = i + 1; j < itemList.length; j++) {
          separateBoxes(itemList[i], itemList[j], 16);
        }
      }
    }

    itemList.forEach((item) => {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(item.scale, item.scale);

      const halfW = item.w / 2;
      ctx.fillStyle = "rgba(5, 5, 5, 0.85)";
      ctx.strokeStyle = item.token.intensity > 1 ? "rgba(255, 178, 102, 0.35)" : "rgba(236, 228, 214, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-halfW, -12, item.w, 24, 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ece4d6";
      ctx.shadowColor = item.token.intensity > 1 ? "#ffb266" : "rgba(236,228,214,0.3)";
      ctx.shadowBlur = 6;
      ctx.fillText(item.token.lemma, 0, 0);

      ctx.restore();
    });

    const lanternList = Array.from(this.lanterns.values());
    lanternList.forEach((lo) => {
      const damp = 0.90;
      if (!lo.settled) {
        lo.vx += (lo.targetX - lo.x) * 0.04;
        lo.vy += (lo.targetY - lo.y) * 0.04;
        lo.vx *= damp;
        lo.vy *= damp;
        if (Math.hypot(lo.targetX - lo.x, lo.targetY - lo.y) < 8) lo.settled = true;
      } else {
        const drift = Math.sin(time * 0.0012 + lo.targetX * 0.05) * 0.3;
        lo.vx = (lo.vx + (lo.targetX - lo.x) * 0.02 + drift) * damp;
        lo.vy = (lo.vy + (lo.targetY - lo.y) * 0.02) * damp;
      }
      lo.x += lo.vx;
      lo.y += lo.vy;
    });

    for (let i = 0; i < lanternList.length; i++) {
      for (let j = i + 1; j < lanternList.length; j++) {
        separateBoxes(lanternList[i], lanternList[j], 18);
      }
    }

    lanternList.forEach((lo) => {
      ctx.save();
      ctx.translate(lo.x, lo.y);

      const halfW = lo.w / 2;
      ctx.fillStyle = "rgba(10, 8, 5, 0.9)";
      ctx.strokeStyle = "rgba(255, 178, 102, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-halfW, -12, lo.w, 24, 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffb266";
      ctx.shadowColor = "#ffb266";
      ctx.shadowBlur = 10;
      ctx.fillText("✦ " + lo.token.text, 0, 0);

      ctx.restore();
    });
  }
}
