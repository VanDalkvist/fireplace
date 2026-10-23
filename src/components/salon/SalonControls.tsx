import React, { useState, useEffect } from "react";
import type { SessionPhase } from "@/domain/types";
import type { SpeechEngineKind } from "@/speech/speech-types";
import { cn } from "@/lib/utils";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Video,
} from "lucide-react";

interface SalonControlsProps {
  phase: SessionPhase;
  isAudioOn: boolean;
  isDemoActive: boolean;
  isVerbatimMode?: boolean;
  isMeetingAudioConnected?: boolean;
  sttEngine?: SpeechEngineKind;
  onPhaseSelect: (phase: SessionPhase) => void;
  onAudioToggle: () => void;
  onToggleMeetingAudio?: () => void;
  onToggleSttEngine?: () => void;
  onToggleVerbatimMode?: () => void;
  onResetVoiceprints?: () => void;
  onResetCircle?: () => void;
  onToggleDemo: () => void;
}

const PHASES: Array<{ id: SessionPhase; label: string }> = [
  { id: "silence", label: "тишина" },
  { id: "feelings", label: "чувства" },
  { id: "desires", label: "желания" },
  { id: "completion", label: "завершение" },
];

export const SalonControls: React.FC<SalonControlsProps> = ({
  phase,
  isAudioOn,
  isDemoActive,
  isVerbatimMode = false,
  isMeetingAudioConnected = false,
  sttEngine = "whisper",
  onPhaseSelect,
  onAudioToggle,
  onToggleMeetingAudio,
  onToggleSttEngine,
  onToggleVerbatimMode,
  onResetVoiceprints,
  onResetCircle,
  onToggleDemo,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleReset = () => {
    onResetVoiceprints?.();
    onResetCircle?.();
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none pointer-events-auto">
      {/* Collapsed Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Открыть техническую панель управления"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-black/40 hover:bg-black/70 border border-border/40 hover:border-primary/50 text-muted/70 hover:text-foreground rounded-full backdrop-blur-md text-[11px] font-mono transition-all duration-200 cursor-pointer shadow-sm"
        >
          <SlidersHorizontal className="w-3 h-3 opacity-70" />
          <span>панель управления</span>
        </button>
      )}

      {/* Expanded Technical Drawer */}
      {isOpen && (
        <div className="w-full max-w-2xl flex flex-col gap-3 p-3.5 bg-[#090807]/90 backdrop-blur-xl border border-primary/25 rounded-[4px] font-mono text-[11px] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
              технические настройки
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 text-[10px] text-muted hover:text-foreground cursor-pointer transition-colors"
            >
              <span>свернуть</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Zoom / Meet audio toggle */}
            {onToggleMeetingAudio && (
              <button
                type="button"
                onClick={onToggleMeetingAudio}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-[2px] cursor-pointer transition-colors",
                  isMeetingAudioConnected
                    ? "bg-primary/20 text-primary border-primary font-semibold"
                    : "border-border text-muted hover:text-foreground hover:bg-secondary"
                )}
              >
                <Video className="w-3.5 h-3.5" />
                <span>встреча (zoom)</span>
              </button>
            )}

            {/* Natural fire response toggle */}
            <button
              type="button"
              onClick={onAudioToggle}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-[2px] cursor-pointer transition-colors",
                isAudioOn
                  ? "bg-primary/20 text-primary border-primary"
                  : "border-border text-muted hover:text-foreground hover:bg-secondary"
              )}
            >
              {isAudioOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>музыка костра (m)</span>
            </button>

            {/* STT engine toggle */}
            {onToggleSttEngine && (
              <button
                type="button"
                onClick={onToggleSttEngine}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-[2px] cursor-pointer hover:bg-secondary text-muted hover:text-foreground transition-colors"
              >
                <span className="opacity-60">stt:</span>
                <span className="font-bold text-primary">{sttEngine}</span>
              </button>
            )}

            {/* Verbatim vs Distilled Mode */}
            {onToggleVerbatimMode && (
              <button
                type="button"
                onClick={onToggleVerbatimMode}
                title="Переключить: фразы целиком или дистилляция через LLM"
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 border rounded-[2px] cursor-pointer transition-colors",
                  isVerbatimMode
                    ? "bg-primary/20 text-primary border-primary font-semibold"
                    : "border-border text-muted hover:text-foreground hover:bg-secondary"
                )}
              >
                <span className="opacity-60">фразы:</span>
                <span>{isVerbatimMode ? "целиком" : "сжатие"}</span>
              </button>
            )}

            {/* Reset circle & voices */}
            <button
              type="button"
              onClick={handleReset}
              title="Очистить отпечатки голосов и участников для новой практики"
              className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-[2px] cursor-pointer hover:bg-secondary text-muted hover:text-primary transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>новый круг</span>
            </button>

            {/* Demo playback mode */}
            <button
              type="button"
              onClick={onToggleDemo}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-[2px] cursor-pointer transition-colors ml-auto",
                isDemoActive
                  ? "bg-primary/20 text-primary border-primary font-semibold"
                  : "border-border text-muted hover:text-foreground hover:bg-secondary"
              )}
            >
              {isDemoActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>демо-круг</span>
            </button>
          </div>

          {/* Practice Phase Selector */}
          <div className="flex items-center gap-1 pt-1 border-t border-border/30">
            <span className="text-[10px] text-muted mr-1.5">фаза:</span>
            {PHASES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPhaseSelect(p.id)}
                className={cn(
                  "px-2.5 py-1 text-[11px] border rounded-[2px] cursor-pointer transition-colors",
                  phase === p.id
                    ? "bg-primary text-primary-foreground font-semibold border-primary"
                    : "border-border/70 text-muted/80 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
