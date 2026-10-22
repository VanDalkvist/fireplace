import React from "react";
import { Sliders, BarChart3 } from "lucide-react";

interface SalonHeaderProps {
  onOpenPult: () => void;
  onOpenAnalytics?: () => void;
}

export const SalonHeader: React.FC<SalonHeaderProps> = ({
  onOpenPult,
  onOpenAnalytics,
}) => {
  return (
    <header className="flex items-center justify-between border border-primary/20 bg-[#090807]/80 px-4 h-10 backdrop-blur-md rounded-[2px] font-mono text-[11px] shadow-lg select-none">
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_6px_#ffb266]" />
        <span className="font-semibold tracking-wide text-foreground">салон присутствия</span>
        <span className="text-muted/40">·</span>
        <span className="text-primary font-medium tracking-wide">костёр</span>
      </div>

      <div className="flex items-center gap-2">
        {onOpenAnalytics && (
          <button
            type="button"
            onClick={onOpenAnalytics}
            title="аналитика круга"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border/60 text-muted hover:text-foreground hover:border-primary/40 rounded-[2px] transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-primary/80" />
            <span className="hidden sm:inline">аналитика</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenPult}
          title="пульт (tab)"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border/60 text-muted hover:text-foreground hover:border-muted rounded-[2px] transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">пульт</span>
        </button>
      </div>
    </header>
  );
};
