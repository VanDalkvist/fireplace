import React from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceIndicatorProps {
  isListening: boolean;
  activeSpeakerNumber: number | null;
  lastPhraseText?: string;
  interimText?: string;
  onToggleListening?: () => void;
  isSupported?: boolean;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening,
  activeSpeakerNumber,
  lastPhraseText,
  interimText,
  onToggleListening,
  isSupported = true,
}) => {
  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <button
        type="button"
        onClick={onToggleListening}
        title={
          !isSupported
            ? "голосовой ввод не поддерживается браузером"
            : isListening
            ? "остановить микрофон (v)"
            : "включить микрофон (v)"
        }
        disabled={!isSupported}
        className={cn(
          "flex items-center gap-2 px-3 py-1 bg-black/60 border rounded-[2px] backdrop-blur-sm transition-colors",
          isSupported ? "cursor-pointer pointer-events-auto" : "opacity-50 cursor-not-allowed",
          isListening ? "border-primary/60 text-primary shadow-sm shadow-primary/20" : "border-border/80 text-muted hover:border-muted"
        )}
      >
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

        <span className="text-[11px] font-mono">
          {activeSpeakerNumber
            ? `участник ${activeSpeakerNumber < 10 ? `0${activeSpeakerNumber}` : activeSpeakerNumber}`
            : "круг в тишине"}
        </span>

        {isListening ? (
          <Mic className="w-3 h-3 text-primary ml-1" />
        ) : (
          <MicOff className="w-3 h-3 text-muted ml-1" />
        )}
      </button>

      {interimText ? (
        <div className="text-[11px] font-mono text-primary/90 italic max-w-sm text-center truncate animate-pulse pointer-events-none">
          «{interimText}…»
        </div>
      ) : lastPhraseText ? (
        <div className="text-[11px] font-mono text-muted/70 italic max-w-sm text-center truncate pointer-events-none">
          «{lastPhraseText}»
        </div>
      ) : null}
    </div>
  );
};
