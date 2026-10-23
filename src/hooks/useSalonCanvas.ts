import { useEffect, useRef } from "react";
import { configureCanvasViewport } from "@/canvas/canvas-viewport";
import type { SessionState } from "@/domain/types";
import type { SalonMotionEngine } from "@/canvas/motion-engine";

export function useSalonCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  motionRef: React.RefObject<SalonMotionEngine | null>,
  state: SessionState
): void {
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    const render = (time: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const targetW = window.innerWidth, targetH = window.innerHeight;
      configureCanvasViewport(canvas, ctx, targetW, targetH, dpr);

      const current = stateRef.current;
      motionRef.current?.syncTokens(
        current.feelings,
        current.desires,
        current.participants,
        current.activeSpeakerId,
        targetW,
        targetH,
        ctx
      );
      motionRef.current?.render(ctx, targetW, targetH, current.activeSpeakerId, time);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [canvasRef, motionRef]);
}
