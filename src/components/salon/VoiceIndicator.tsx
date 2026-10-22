import React from "react";
import { Mic, MicOff } from "lucide-react";
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

function cleanErrorMessage(msg: string): string {
  if (msg.includes("422") || msg.includes("audio format") || msg.includes("transcription_error")) {
    return "не удалось разобрать реплику — микрофон переподключён";
  }
  if (msg.includes("500") || msg.includes("Connection refused") || msg.includes("Failed to fetch")) {
    return "сервер распознавания временно недоступен";
  }
  return msg;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
  isListening,
  audioLevel = 0,
  pipelineStatus: _pipelineStatus = "idle",
  lastPhraseText,
  interimText,
  interimBadge,
  errorMessage,
  onToggleListening,
  isSupported = true,
  engineType: _engineType = "whisper",
  isMeetingAudio: _isMeetingAudio = false,
}) => {
  const energyScale = 1 + Math.min(Math.max(audioLevel * 10, 0), 0.7);
  const energyOpacity = 0.35 + Math.min(Math.max(audioLevel * 6, 0), 0.65);

  const statusLabel = isListening ? "слушаю" : "микрофон (v)";

  return (
    <div className="flex flex-col items-center gap-1.5 select-none pointer-events-auto">
      <button
        type="button"
        onClick={onToggleListening}
        title={isListening ? "остановить микрофон (v)" : "включить микрофон (v)"}
        disabled={!isSupported}
        className={cn(
          "relative flex items-center justify-center gap-2 px-3.5 py-1 min-w-[132px] bg-black/25 hover:bg-black/45 rounded-full backdrop-blur-md transition-all duration-300",
          isSupported ? "cursor-pointer" : "opacity-50 cursor-not-allowed",
          isListening ? "text-primary/90" : "text-muted/70 hover:text-foreground"
        )}
      >
        {/* Dynamic VU Meter Ring: subtle breathing pulse without button resizing or flashing */}
        <span className="relative flex h-2 w-2 items-center justify-center">
          {isListening && (
            <span
              className="absolute inline-flex rounded-full bg-primary transition-transform duration-75"
              style={{
                width: "8px",
                height: "8px",
                transform: `scale(${energyScale})`,
                opacity: energyOpacity,
              }}
            />
          )}
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              isListening ? "bg-primary" : "bg-muted"
            )}
          />
        </span>

        <span className="text-[11px] font-mono tracking-wide">
          {statusLabel}
        </span>

        {isListening ? (
          <Mic className="w-3 h-3 text-primary ml-0.5 opacity-80" />
        ) : (
          <MicOff className="w-3 h-3 text-muted ml-0.5 opacity-60" />
        )}
      </button>

      <div className="h-5 flex items-center justify-center pointer-events-none">
        {errorMessage ? (
          <div className="flex items-center gap-2 px-3 py-0.5 bg-destructive/15 rounded-full text-[11px] font-mono text-destructive backdrop-blur-sm max-w-lg text-center animate-in fade-in">
            <span>{cleanErrorMessage(errorMessage)}</span>
          </div>
        ) : interimText ? (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary/90 italic max-w-sm text-center truncate animate-pulse">
            <span>«{interimText}…»</span>
            {interimBadge && (
              <span className="not-italic text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full">
                {interimBadge.text}
              </span>
            )}
          </div>
        ) : lastPhraseText && lastPhraseText !== "тишина у огня" ? (
          <div className="text-[11px] font-mono text-muted/60 italic max-w-sm text-center truncate transition-opacity duration-1000">
            «{lastPhraseText}»
          </div>
        ) : null}
      </div>
    </div>
  );
};
