import { useEffect } from "react";
import type { SessionPhase } from "@/domain/types";

export interface UseSalonHotkeysOptions {
  onTogglePult: () => void;
  onToggleHelp: () => void;
  onToggleZen: () => void;
  onToggleFullscreen: () => void;
  onTriggerTurn: () => void;
  onPass: () => void;
  onToggleAudio: () => void;
  onToggleSpeech?: () => void;
  onAdvanceTurn?: () => void;
  onSelectPhase: (phase: SessionPhase) => void;
  onAdvancePhase: () => void;
}

export function useSalonHotkeys({
  onTogglePult,
  onToggleHelp,
  onToggleZen,
  onToggleFullscreen,
  onTriggerTurn,
  onPass,
  onToggleAudio,
  onToggleSpeech,
  onAdvanceTurn,
  onSelectPhase,
  onAdvancePhase,
}: UseSalonHotkeysOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "KeyN") {
        if (e.repeat || e.isComposing || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.tagName === "SELECT")) return;
        e.preventDefault();
        onAdvancePhase();
      } else if (e.code === "Space") {
        e.preventDefault();
        onTriggerTurn();
      } else if (e.key === "h" || e.key === "р") {
        onToggleZen();
      } else if (e.key === "f" || e.key === "а") {
        onToggleFullscreen();
      } else if (e.key === "m" || e.key === "ь") {
        onToggleAudio();
      } else if (e.key === "Tab") {
        e.preventDefault();
        onTogglePult();
      } else if (e.key === "?") {
        onToggleHelp();
      } else if (e.key === "p" || e.key === "з") {
        onPass();
      } else if ((e.key === "v" || e.key === "м") && onToggleSpeech) {
        onToggleSpeech();
      } else if (e.key === "ArrowRight" && onAdvanceTurn) {
        e.preventDefault();
        onAdvanceTurn();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const phases: SessionPhase[] = ["silence", "feelings", "desires", "completion"];
        const p = phases[parseInt(e.key, 10) - 1];
        if (p) onSelectPhase(p);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onTogglePult,
    onToggleHelp,
    onToggleZen,
    onToggleFullscreen,
    onTriggerTurn,
    onPass,
    onToggleAudio,
    onToggleSpeech,
    onAdvanceTurn,
    onSelectPhase,
    onAdvancePhase,
  ]);
}
