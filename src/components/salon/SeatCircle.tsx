import React from "react";
import type { Participant } from "@/domain/types";
import { cn } from "@/lib/utils";

interface SeatCircleProps {
  participants: Participant[];
  activeSpeakerId: number | null;
  onSelectSpeaker: (speakerId: number) => void;
}

export const SeatCircle: React.FC<SeatCircleProps> = ({
  participants,
  activeSpeakerId,
  onSelectSpeaker,
}) => {
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap p-2 select-none">
      {participants.map((p) => {
        const isCurrent = p.id === activeSpeakerId;
        return (
          <button
            key={p.id}
            onClick={() => onSelectSpeaker(p.id)}
            title={`место ${p.seatNumber}${p.isHost ? " (ведущий)" : ""}${
              p.hasPassed ? " (пас)" : ""
            }`}
            className={cn(
              "relative px-2.5 py-1 text-[11px] font-mono rounded-[2px] border transition-all cursor-pointer min-w-[32px] text-center",
              isCurrent
                ? "border-primary bg-primary/20 text-primary font-bold shadow-[0_0_12px_rgba(255,178,102,0.25)]"
                : p.hasPassed
                ? "border-border/40 text-muted/40 bg-transparent line-through"
                : "border-border/80 text-muted hover:border-muted hover:text-foreground bg-black/40"
            )}
          >
            {/* Host indicator: top red pip */}
            {p.isHost && (
              <span className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-0.5 bg-destructive rounded-full" />
            )}

            <span>{p.seatNumber < 10 ? `0${p.seatNumber}` : p.seatNumber}</span>

            {/* Speaking indicator: bottom pip */}
            {isCurrent && (
              <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-2 h-0.5 bg-primary shadow-[0_0_6px_#ffb266]" />
            )}
          </button>
        );
      })}
    </div>
  );
};
