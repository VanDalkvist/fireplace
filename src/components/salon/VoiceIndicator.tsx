import React from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceIndicatorProps {
  isListening: boolean;
  activeSpeakerNumber: number | null;
  lastPhraseText?: string;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening,
  activeSpeakerNumber,
  lastPhraseText,
}) => {
  return (
    <div className="flex flex-col items-center gap-1.5 select-none pointer-events-none">
      <div className="flex items-center gap-2 px-3 py-1 bg-black/60 border border-border/80 rounded-[2px] backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          {isListening && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isListening ? "bg-primary" : "bg-muted"
            )}
          />
        </span>

        <span className="text-[11px] font-mono text-muted">
          {activeSpeakerNumber
            ? `участник ${activeSpeakerNumber < 10 ? `0${activeSpeakerNumber}` : activeSpeakerNumber}`
            : "круг в тишине"}
        </span>

        {isListening ? (
          <Mic className="w-3 h-3 text-primary ml-1" />
        ) : (
          <MicOff className="w-3 h-3 text-muted ml-1" />
        )}
      </div>

      {lastPhraseText && (
        <div className="text-[11px] font-mono text-muted/70 italic max-w-sm text-center truncate">
          «{lastPhraseText}»
        </div>
      )}
    </div>
  );
};
