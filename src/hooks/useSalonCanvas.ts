import { useEffect } from "react";
import type { SessionState } from "@/domain/types";
import type { SalonMotionEngine } from "@/canvas/motion-engine";

export function useSalonCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  motionRef: React.RefObject<SalonMotionEngine | null>,
  state: SessionState
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const render = (time: number) => {
      const w = (canvas.width = Math.round(window.innerWidth * dpr));
      const h = (canvas.height = Math.round(window.innerHeight * dpr));
      motionRef.current?.syncTokens(
        state.feelings,
        state.desires,
        state.participants,
        state.activeSpeakerId,
        w,
        h,
        ctx
      );
      motionRef.current?.render(ctx, w, h, state.activeSpeakerId, time);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [canvasRef, motionRef, state.feelings, state.desires, state.participants, state.activeSpeakerId]);
}
