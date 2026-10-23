import React, { useState, useEffect } from "react";
import type { SessionPhase } from "@/domain/types";
import type { SpeechEngineKind } from "@/speech/speech-types";
import { cn } from "@/lib/utils";
import { FireRecordingButton } from "./FireRecordingButton";
import {
  Settings,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";

interface TechnicalGearPultProps {
  sttEngine: SpeechEngineKind;
  onToggleSttEngine: () => void;
  distillerEngine?: string;
  onToggleDistillerEngine?: () => void;
  isVerbatimMode: boolean;
  onToggleVerbatimMode: () => void;
  isAudioOn: boolean;
  onAudioToggle: () => void;
  recordingLabel?: string;
  recordingPosition?: string;
  onCycleRecording?: () => void;
  phase: SessionPhase;
  onPhaseSelect: (phase: SessionPhase) => void;
  isDemoActive: boolean;
  onToggleDemo: () => void;
  onResetCircle: () => void;
}

const PHASES: Array<{ id: SessionPhase; label: string }> = [
  { id: "silence", label: "тишина" },
  { id: "feelings", label: "чувства" },
  { id: "desires", label: "желания" },
  { id: "completion", label: "финал" },
];

export const TechnicalGearPult: React.FC<TechnicalGearPultProps> = ({
  sttEngine,
  onToggleSttEngine,
  distillerEngine = "openrouter",
  onToggleDistillerEngine,
  isVerbatimMode,
  onToggleVerbatimMode,
  isAudioOn,
  onAudioToggle,
  recordingLabel, recordingPosition, onCycleRecording,
  phase,
  onPhaseSelect,
  isDemoActive,
  onToggleDemo,
  onResetCircle,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative flex items-center justify-end select-none pointer-events-auto font-mono text-[11px]">
      {/* Sliding Control Bar to the Left */}
      {isOpen && (
        <div className="flex items-center gap-2 px-3 py-1 mr-2 bg-[#0a0705]/85 backdrop-blur-xl rounded-full shadow-2xl animate-in slide-in-from-right-4 fade-in duration-200">
          {/* STT Engine */}
          <button
            type="button"
            onClick={onToggleSttEngine}
            title="Переключить STT движок (Whisper / GigaAM / Google)"
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <span className="opacity-50">stt:</span>
            <span className="font-semibold text-primary/90">{sttEngine}</span>
          </button>

          {/* Verbatim Mode */}
          <button
            type="button"
            onClick={onToggleVerbatimMode}
            title="Режим распознавания: фразы целиком или дистилляция через LLM"
            className={cn(
              "px-2 py-0.5 rounded-full cursor-pointer transition-colors",
              isVerbatimMode
                ? "bg-primary/20 text-primary font-medium"
                : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="opacity-50 mr-1">текст:</span>
            <span>{isVerbatimMode ? "целиком" : "сжатие"}</span>
          </button>

          {/* Registered distiller plugin switcher */}
          {!isVerbatimMode && onToggleDistillerEngine && (
            <button
              type="button"
              onClick={onToggleDistillerEngine}
              title="Переключить движок дистилляции (OpenRouter / Ollama / Pi)"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <span className="opacity-50">llm:</span>
              <span className="font-semibold text-primary/90">{distillerEngine}</span>
            </button>
          )}

          {/* Audio Engine */}
          <button
            type="button"
            onClick={onAudioToggle}
            title="Потрескивание костра при репликах (клавиша M)"
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer transition-colors",
              isAudioOn
                ? "bg-primary/20 text-primary font-medium"
                : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
            )}
          >
            {isAudioOn ? <Volume2 className="w-3 h-3 text-primary" /> : <VolumeX className="w-3 h-3 opacity-60" />}
            <span>звук</span>
          </button>

          {recordingLabel && recordingPosition && onCycleRecording && (
            <FireRecordingButton label={recordingLabel} position={recordingPosition} onCycle={onCycleRecording} />
          )}

          {/* Phase Selector */}
          <div className="flex items-center gap-0.5 bg-white/5 rounded-full p-0.5">
            {PHASES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPhaseSelect(p.id)}
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] cursor-pointer transition-colors",
                  phase === p.id
                    ? "bg-primary/25 text-primary font-semibold"
                    : "text-muted-foreground/70 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Demo toggle */}
          <button
            type="button"
            onClick={onToggleDemo}
            title="Автоматический демо-прогон реплик"
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer transition-colors",
              isDemoActive
                ? "bg-primary/20 text-primary font-medium"
                : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground"
            )}
          >
            {isDemoActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>демо</span>
          </button>

          {/* Reset Circle */}
          <button
            type="button"
            onClick={onResetCircle}
            title="Очистить круг и отпечатки голосов"
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>сброс</span>
          </button>
        </div>
      )}

      {/* Tiny Subtle Gear Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "Закрыть техническую панель (Esc)" : "Технические настройки (шестерёнка)"}
        className={cn(
          "flex items-center justify-center w-7 h-7 rounded-full bg-black/20 hover:bg-black/50 text-muted/50 hover:text-foreground backdrop-blur-md transition-all duration-200 cursor-pointer",
          isOpen && "bg-black/60 text-primary/80 rotate-90"
        )}
      >
        {isOpen ? <X className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};
