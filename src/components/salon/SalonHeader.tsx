import React from "react";
import { ExternalLink } from "lucide-react";

export const SalonHeader: React.FC = () => {
  return (
    <header className="flex items-center gap-2.5 px-3 h-8 font-mono text-[11px] select-none pointer-events-auto">
      <span className="w-1.5 h-1.5 bg-primary/80 rounded-full shadow-[0_0_6px_#ffb266]" />
      <a
        href="https://space-season-salon.lab.aimindset.org/tools/"
        target="_blank"
        rel="noopener noreferrer"
        title="Салон присутствия: витрина инструментов"
        className="font-medium tracking-wide text-foreground/90 hover:text-primary transition-colors cursor-pointer underline-offset-2 hover:underline"
      >
        салон присутствия
      </a>
      <span className="text-muted/40">·</span>
      <span className="text-primary/90 font-normal tracking-wide">разговор у костра</span>
      <span className="text-muted/40">·</span>
      <a
        href="https://vanya-arc.lovable.app"
        target="_blank"
        rel="noopener noreferrer"
        title="Автор инструмента: Ваня Афанасов"
        className="inline-flex items-center gap-1 text-muted-foreground/75 hover:text-primary transition-colors cursor-pointer group underline-offset-2 hover:underline"
      >
        <span>автор: Ваня Афанасов</span>
        <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
      </a>
    </header>
  );
};
