import React from "react";
import type { SessionPhase } from "@/domain/types";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX, Sliders } from "lucide-react";

interface SalonHeaderProps {
  phase: SessionPhase;
  isAudioOn: boolean;
  isListening: boolean;
  onPhaseSelect: (phase: SessionPhase) => void;
  onAudioToggle: () => void;
  onOpenPult: () => void;
}

const PHASES: { id: SessionPhase; label: string }[] = [
  { id: "silence", label: "01 тишина" },
  { id: "feelings", label: "02 круг чувств" },
  { id: "desires", label: "03 чего хочется" },
  { id: "completion", label: "04 выход" },
];

export const SalonHeader: React.FC<SalonHeaderProps> = ({
  phase,
  isAudioOn,
  isListening,
  onPhaseSelect,
  onAudioToggle,
  onOpenPult,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur-sm select-none">
      <div className="flex items-center gap-3">
        <a href="../" className="text-muted hover:text-foreground transition-colors mr-2">
          ←
        </a>
        <div className="flex items-baseline gap-1.5 font-mono text-sm tracking-tight">
          <span className="font-semibold text-foreground">салон присутствия</span>
          <span className="text-destructive font-bold">.</span>
          <span className="text-[11px] text-muted ml-2 hidden sm:inline">
            {isListening ? "● слушает" : "○ пауза"}
          </span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1">
        {PHASES.map((p) => {
          const isActive = phase === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onPhaseSelect(p.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors cursor-pointer",
                isActive
                  ? "bg-primary/15 text-primary border border-primary/40 font-medium"
                  : "text-muted hover:text-foreground border border-transparent"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <button
          onClick={onAudioToggle}
          title="звук (m)"
          className={cn(
            "p-1.5 rounded-[2px] border transition-colors cursor-pointer",
            isAudioOn
              ? "border-primary/50 text-primary bg-primary/10"
              : "border-border text-muted hover:text-foreground"
          )}
        >
          {isAudioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenPult}
          title="пульт (tab)"
          className="flex items-center gap-1.5 px-2 py-1 text-xs border border-border text-muted hover:text-foreground hover:border-muted rounded-[2px] transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">пульт</span>
        </button>
      </div>
    </header>
  );
};
