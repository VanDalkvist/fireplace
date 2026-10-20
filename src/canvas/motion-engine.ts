import type { FeelingToken, DesireToken, ConnectionEdge, Participant } from "@/domain/types";
import { drawPresenceEdge, type NodePosition } from "./graph-renderer";
import { drawTopologicalIsoclines, drawSeatPresenceRay } from "./field-renderer";

export interface MotionItem {
  token: FeelingToken;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  scale: number;
  pulse: number;
}

export interface LanternItem {
  token: DesireToken;
  x: number;
  y: number;
  vy: number;
  alpha: number;
}

export class SalonMotionEngine {
  private items: Map<string, MotionItem> = new Map();
  private lanterns: Map<string, LanternItem> = new Map();

  public syncTokens(
    feelings: FeelingToken[],
    desires: DesireToken[],
    participants: Participant[],
    width: number,
    height: number
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.32;

    const getSpeakerSeat = (speakerId: number): NodePosition => {
      const idx = participants.findIndex((p) => p.id === speakerId);
      const total = participants.length || 12;
      const angle = (idx >= 0 ? idx : 0) * ((2 * Math.PI) / total) - Math.PI / 2;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    };

    feelings.forEach((token) => {
      if (!this.items.has(token.id)) {
        const origin = getSpeakerSeat(token.speakerId);
        const offsetAngle = Math.random() * Math.PI * 2;
        const offsetDist = Math.random() * (radius * 0.45);
        this.items.set(token.id, {
          token,
          x: origin.x,
          y: origin.y,
          vx: 0,
          vy: 0,
          targetX: centerX + Math.cos(offsetAngle) * offsetDist,
          targetY: centerY + Math.sin(offsetAngle) * offsetDist,
          originX: origin.x,
          originY: origin.y,
          scale: 0.2,
          pulse: 1.0,
        });
      }
    });

    desires.forEach((token) => {
      if (!this.lanterns.has(token.id)) {
        const origin = getSpeakerSeat(token.speakerId);
        this.lanterns.set(token.id, {
          token,
          x: origin.x,
          y: origin.y,
          vy: -0.6 - Math.random() * 0.4,
          alpha: 1.0,
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
    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Draw topological field isoclines (breathing presence relief)
    const fieldNodes = Array.from(this.items.values()).map((it) => ({
      x: it.x,
      y: it.y,
      weight: it.token.intensity,
    }));
    drawTopologicalIsoclines(ctx, centerX, centerY, fieldNodes, time);

    // 2. Draw origin rays and connection edges
    this.items.forEach((item) => {
      drawSeatPresenceRay(ctx, item.originX, item.originY, item.x, item.y, item.token.intensity);
    });

    edges.forEach((edge) => {
      const src = this.items.get(edge.sourceTokenId);
      const tgt = this.items.get(edge.targetTokenId);
      if (src && tgt) {
        drawPresenceEdge(ctx, edge, { x: src.x, y: src.y }, { x: tgt.x, y: tgt.y }, time);
      }
    });

    // 3. Render and update feelings
    this.items.forEach((item) => {
      const k = 0.04;
      const damp = 0.88;
      item.vx = (item.vx + (item.targetX - item.x) * k) * damp;
      item.vy = (item.vy + (item.targetY - item.y) * k) * damp;
      item.x += item.vx;
      item.y += item.vy;
      item.scale += (1.0 - item.scale) * 0.08;

      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.scale(item.scale, item.scale);

      ctx.shadowColor = item.token.intensity > 1 ? "#ffb266" : "rgba(236,228,214,0.3)";
      ctx.shadowBlur = 8;

      ctx.font = "13px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ece4d6";
      ctx.fillText(item.token.lemma, 0, 0);

      ctx.restore();
    });

    // 4. Render lanterns of desires
    this.lanterns.forEach((lantern) => {
      lantern.y += lantern.vy;
      lantern.x += Math.sin(time * 0.003 + lantern.y * 0.01) * 0.3;

      ctx.save();
      ctx.translate(lantern.x, lantern.y);
      ctx.shadowColor = "#ffb266";
      ctx.shadowBlur = 14;

      ctx.font = "14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffb266";
      ctx.fillText("✦ " + lantern.token.text, 0, 0);

      ctx.restore();
    });
  }
}
