import React from "react";
import type { SessionPhase } from "@/domain/types";
import { cn } from "@/lib/utils";
import { Sliders, BarChart3 } from "lucide-react";

interface SalonHeaderProps {
  phase: SessionPhase;
  isListening: boolean;
  isZen: boolean;
  onPhaseSelect: (phase: SessionPhase) => void;
  onToggleZen: () => void;
  onOpenPult: () => void;
  onOpenAnalytics?: () => void;
  onOpenHelp?: () => void;
}

const PHASES: { id: SessionPhase; label: string }[] = [
  { id: "silence", label: "01 тишина" },
  { id: "feelings", label: "02 круг чувств" },
  { id: "desires", label: "03 чего хочется" },
  { id: "completion", label: "04 выход" },
];

export const SalonHeader: React.FC<SalonHeaderProps> = ({
  phase,
  isListening,
  isZen,
  onPhaseSelect,
  onToggleZen,
  onOpenPult,
  onOpenAnalytics,
  onOpenHelp,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 border border-primary/20 bg-[#090807]/80 px-4 py-2 backdrop-blur-md rounded-[2px] font-mono text-[11px] shadow-lg select-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/30 text-primary font-bold rounded-[2px]">
          <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_6px_#ffb266] animate-pulse" />
          <span>салон присутствия</span>
        </div>
        <span className="text-muted hidden md:inline">· созерцательный очаг</span>
      </div>

      <nav className="hidden sm:flex items-center gap-1">
        {PHASES.map((p) => {
          const isActive = phase === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onPhaseSelect(p.id)}
              className={cn(
                "px-2 py-0.5 rounded-[2px] transition-colors cursor-pointer",
                isActive
                  ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                  : "text-muted hover:text-foreground border border-transparent"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <span className="text-primary text-[10px] hidden lg:inline mr-2">
          {isListening ? "● слушает голос" : "тишина у огня"}
        </span>

        <button
          onClick={onToggleZen}
          title="зен-режим (h)"
          className={cn(
            "px-2.5 py-1 text-xs border rounded-[2px] transition-colors cursor-pointer font-medium",
            isZen
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted hover:text-foreground hover:border-primary/40"
          )}
        >
          зен (h)
        </button>

        <button
          onClick={onOpenPult}
          title="пульт (tab)"
          className="flex items-center gap-1.5 px-2 py-1 text-xs border border-border text-muted hover:text-foreground hover:border-muted rounded-[2px] transition-colors cursor-pointer"
        >
          <Sliders className="w-3 h-3" />
          <span className="hidden sm:inline">пульт</span>
        </button>

        {onOpenAnalytics && (
          <button
            onClick={onOpenAnalytics}
            title="аналитика круга"
            className="flex items-center gap-1 px-2 py-1 text-xs border border-border text-muted hover:text-foreground hover:border-primary/40 rounded-[2px] transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3 h-3 text-primary/80" />
            <span className="hidden sm:inline">аналитика</span>
          </button>
        )}

        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            title="правила круга (?)"
            className="px-2 py-1 text-xs border border-border text-muted hover:text-foreground hover:border-muted rounded-[2px] transition-colors cursor-pointer"
          >
            ?
          </button>
        )}
      </div>
    </header>
  );
};
