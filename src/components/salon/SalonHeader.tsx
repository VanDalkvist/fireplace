import React from "react";

export const SalonHeader: React.FC = () => {
  return (
    <header className="flex items-center gap-2.5 px-3 h-8 font-mono text-[11px] select-none pointer-events-auto">
      <span className="w-1.5 h-1.5 bg-primary/80 rounded-full shadow-[0_0_6px_#ffb266]" />
      <span className="font-medium tracking-wide text-foreground/90">салон присутствия</span>
      <span className="text-muted/40">·</span>
      <span className="text-primary/90 font-normal tracking-wide">разговор у костра</span>
    </header>
  );
};
