import React from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InterimBadge {
  text: string;
  type: "feeling" | "desire" | "pass";
}

interface VoiceIndicatorProps {
  isListening: boolean;
  activeSpeakerNumber: number | null;
  lastPhraseText?: string;
  interimText?: string;
  interimBadge?: InterimBadge | null;
  errorMessage?: string | null;
  onToggleListening?: () => void;
  isSupported?: boolean;
  engineType?: "whisper" | "google";
  isMeetingAudio?: boolean;
  identifiedSpeaker?: { seatNumber: number; speakerId?: string } | null;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening,
  activeSpeakerNumber,
  lastPhraseText,
  interimText,
  interimBadge,
  errorMessage,
  onToggleListening,
  isSupported = true,
  engineType = "whisper",
  isMeetingAudio = false,
  identifiedSpeaker,
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
          {identifiedSpeaker ? (
            <span className="text-primary font-semibold">
              голос: стул {identifiedSpeaker.seatNumber < 10 ? `0${identifiedSpeaker.seatNumber}` : identifiedSpeaker.seatNumber}
              {isListening ? ` · слушаю ${isMeetingAudio ? "встречу" : `(${engineType})`}...` : ""}
            </span>
          ) : activeSpeakerNumber ? (
            `участник ${activeSpeakerNumber < 10 ? `0${activeSpeakerNumber}` : activeSpeakerNumber} ${
              isListening
                ? `· слушаю ${isMeetingAudio ? "встречу (zoom)" : `(${engineType})`}...`
                : "· нажми микрофон (v)"
            }`
          ) : isListening ? (
            `слушаю круг ${isMeetingAudio ? "встречи (zoom)" : `(${engineType})`}...`
          ) : (
            "включить голос (v)"
          )}
        </span>

        {isListening ? (
          <Mic className="w-3 h-3 text-primary ml-1" />
        ) : (
          <MicOff className="w-3 h-3 text-muted ml-1" />
        )}
      </button>

      {errorMessage ? (
        <div className="flex items-center gap-2 px-3 py-1 bg-destructive/15 border border-destructive/50 rounded-[2px] text-[11px] font-mono text-destructive backdrop-blur-sm max-w-lg text-center animate-in fade-in">
          <span>{errorMessage} (или нажми enter для ввода текста)</span>
          <a
            href="http://127.0.0.1:4343/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground ml-1 font-semibold text-primary"
          >
            открыть в Chrome ↗
          </a>
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
      ) : lastPhraseText ? (
        <div className="text-[11px] font-mono text-muted/70 italic max-w-sm text-center truncate pointer-events-none">
          «{lastPhraseText}»
        </div>
      ) : null}
    </div>
  );
};
