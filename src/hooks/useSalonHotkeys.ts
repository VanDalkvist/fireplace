import { useEffect } from "react";
import type { SessionPhase } from "@/domain/types";

export interface UseSalonHotkeysOptions {
  onTogglePult: () => void;
  onToggleHelp: () => void;
  onNextSpeaker: () => void;
  onPass: () => void;
  onToggleAudio: () => void;
  onToggleSpeech: () => void;
  onSelectPhase: (phase: SessionPhase) => void;
}

export function useSalonHotkeys({
  onTogglePult,
  onToggleHelp,
  onNextSpeaker,
  onPass,
  onToggleAudio,
  onToggleSpeech,
  onSelectPhase,
}: UseSalonHotkeysOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab") {
        e.preventDefault();
        onTogglePult();
      } else if (e.key === "h" || e.key === "р" || e.key === "?") {
        onToggleHelp();
      } else if (e.key === " ") {
        e.preventDefault();
        onNextSpeaker();
      } else if (e.key === "p" || e.key === "з") {
        onPass();
      } else if (e.key === "m" || e.key === "ь") {
        onToggleAudio();
      } else if (e.key === "v" || e.key === "м") {
        onToggleSpeech();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const phases: SessionPhase[] = ["silence", "feelings", "desires", "completion"];
        onSelectPhase(phases[parseInt(e.key, 10) - 1]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onTogglePult,
    onToggleHelp,
    onNextSpeaker,
    onPass,
    onToggleAudio,
    onToggleSpeech,
    onSelectPhase,
  ]);
}
