import React from "react";
import { Mic, MicOff, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpeechEngineKind, SpeechPipelineStatus } from "@/speech/speech-types";

export interface InterimBadge {
  text: string;
  type: "feeling" | "desire" | "pass";
}

interface VoiceIndicatorProps {
  isListening: boolean;
  audioLevel?: number;
  pipelineStatus?: SpeechPipelineStatus;
  lastPhraseText?: string;
  interimText?: string;
  interimBadge?: InterimBadge | null;
  errorMessage?: string | null;
  onToggleListening?: () => void;
  isSupported?: boolean;
  engineType?: SpeechEngineKind;
  isMeetingAudio?: boolean;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening,
  audioLevel = 0,
  pipelineStatus = "idle",
  lastPhraseText,
  interimText,
  interimBadge,
  errorMessage,
  onToggleListening,
  isSupported = true,
  engineType = "whisper",
  isMeetingAudio = false,
}) => {
  const energyScale = 1 + Math.min(Math.max(audioLevel * 12, 0), 0.85);
  const energyOpacity = 0.3 + Math.min(Math.max(audioLevel * 8, 0), 0.7);

  const getStatusLabel = (): string => {
    if (!isListening) return "микрофон (v)";
    if (pipelineStatus === "hearing") return "слышу речь…";
    if (pipelineStatus === "transcribing") return `распознаю (${engineType})…`;
    if (pipelineStatus === "distilling") return "нейрокоррекция…";
    if (isMeetingAudio) return "встреча: микрофон + zoom";
    return `слушаю круг (${engineType})...`;
  };

  const isHearing = isListening && pipelineStatus === "hearing";
  const isTranscribing = isListening && pipelineStatus === "transcribing";

  return (
    <div className="flex flex-col items-center gap-1.5 select-none pointer-events-auto">
      <button
        type="button"
        onClick={onToggleListening}
        title={isListening ? "остановить микрофон (v)" : "включить микрофон (v)"}
        disabled={!isSupported}
        className={cn(
          "relative flex items-center gap-2 px-3 py-1 bg-black/40 border rounded-full backdrop-blur-md transition-all duration-300",
          isSupported ? "cursor-pointer" : "opacity-50 cursor-not-allowed",
          !isListening && "border-border/60 text-muted/80 hover:border-muted hover:text-foreground",
          isListening && !isHearing && !isTranscribing && "border-primary/50 text-primary shadow-sm shadow-primary/20",
          isHearing && "border-emerald-500/80 text-emerald-400 shadow-md shadow-emerald-500/30",
          isTranscribing && "border-amber-500/80 text-amber-400 shadow-md shadow-amber-500/30"
        )}
      >
        {/* Dynamic VU Meter Ring */}
        <span className="relative flex h-2 w-2 items-center justify-center">
          {isListening && (
            <span
              className={cn(
                "absolute inline-flex rounded-full transition-transform duration-75",
                isHearing ? "bg-emerald-400" : isTranscribing ? "bg-amber-400" : "bg-primary"
              )}
              style={{
                width: "10px",
                height: "10px",
                transform: `scale(${energyScale})`,
                opacity: energyOpacity,
              }}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              !isListening && "bg-muted",
              isListening && !isHearing && !isTranscribing && "bg-primary",
              isHearing && "bg-emerald-400",
              isTranscribing && "bg-amber-400 animate-pulse"
            )}
          />
        </span>

        <span className="text-[11px] font-mono tracking-wide">
          {getStatusLabel()}
        </span>

        {isHearing ? (
          <Waves className="w-3 h-3 text-emerald-400 ml-0.5 animate-pulse" />
        ) : isListening ? (
          <Mic className="w-3 h-3 text-primary ml-0.5 opacity-80" />
        ) : (
          <MicOff className="w-3 h-3 text-muted ml-0.5 opacity-60" />
        )}
      </button>

      {errorMessage ? (
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/15 border border-destructive/40 rounded-[2px] text-[11px] font-mono text-destructive backdrop-blur-sm max-w-lg text-center animate-in fade-in">
          <span>{errorMessage}</span>
        </div>
      ) : interimText ? (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary/90 italic max-w-sm text-center truncate animate-pulse pointer-events-none">
          <span>«{interimText}…»</span>
          {interimBadge && (
            <span className="not-italic text-[10px] px-1.5 py-0.2 bg-primary/20 text-primary border border-primary/40 rounded-[2px]">
              [{interimBadge.text}]
            </span>
          )}
        </div>
      ) : lastPhraseText && lastPhraseText !== "тишина у огня" ? (
        <div className="text-[11px] font-mono text-muted/60 italic max-w-sm text-center truncate pointer-events-none transition-opacity duration-1000">
          «{lastPhraseText}»
        </div>
      ) : null}
    </div>
  );
};
