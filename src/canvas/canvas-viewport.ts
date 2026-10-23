export function configureCanvasViewport(canvas: Pick<HTMLCanvasElement, "width" | "height">, ctx: Pick<CanvasRenderingContext2D, "setTransform">, width: number, height: number, dpr: number): void {
  const w = Math.round(width * dpr), h = Math.round(height * dpr);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
