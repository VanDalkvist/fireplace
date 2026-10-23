export interface HearthWordItem {
  id: string; text: string; family: string; seatId: number; width: number;
  x: number; y: number; targetX: number; targetY: number; born: number;
  lastAt: number; count: number; settled: boolean; opacity: number; breathOffset: number;
  relAngle?: number; relRadius?: number; lines?: string[]; height?: number;
  sourceId?: string; sourceText?: string;
}

export interface FlightSpark {
  sx: number; sy: number; tx: number; ty: number; born: number; duration: number;
}

export interface HearthViewport { cx: number; cy: number; rx: number; ry: number }
