import { useCallback, useEffect, useRef } from "react";
import type { SessionPhase } from "@/domain/types";

export function useSpeakerDecay(phase: SessionPhase, onClear: () => void): () => void {
  const callback = useRef(onClear); callback.current = onClear;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const clear = useCallback(() => { cancel(); callback.current(); }, [cancel]);
  const schedule = useCallback(() => { cancel(); timer.current = setTimeout(clear, 5000); }, [cancel, clear]);
  useEffect(() => { clear(); return cancel; }, [phase, clear, cancel]);
  return schedule;
}
