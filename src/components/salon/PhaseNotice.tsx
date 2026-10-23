import { useEffect, useRef, useState } from "react";
import type { SessionPhase } from "@/domain/types";
import "./phase-notice.css";

const LABELS: Record<SessionPhase, string> = {
  silence: "начало", feelings: "чувства", desires: "желания", completion: "финал",
};

export function PhaseNotice({ phase, onTransition }: { phase: SessionPhase; onTransition: () => void }) {
  const previous = useRef(phase);
  const callback = useRef(onTransition); callback.current = onTransition;
  const [visible, setVisible] = useState<SessionPhase | null>(null);
  useEffect(() => {
    if (previous.current === phase) return;
    previous.current = phase;
    setVisible(phase);
    callback.current();
    const timer = setTimeout(() => setVisible(null), 4000);
    return () => clearTimeout(timer);
  }, [phase]);

  return <div role="status" aria-live="polite" aria-atomic="true" className="pointer-events-none">
    {visible && <span key={visible} data-phase-notice={visible} className="phase-notice">{LABELS[visible]}</span>}
  </div>;
}
