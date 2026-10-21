import React from "react";
import type { SessionPhase } from "@/domain/types";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX, Play, Pause, Mic, MicOff } from "lucide-react";

interface SalonControlsProps {
  phase: SessionPhase;
  isAudioOn: boolean;
  isListening?: boolean;
  isDemoActive: boolean;
  engineStatus?: { online: boolean; hasModel: boolean };
  onPhaseSelect: (phase: SessionPhase) => void;
  onAudioToggle: () => void;
  onSpeechToggle?: () => void;
  onInputToggle?: () => void;
  onTriggerTurn: () => void;
  onToggleDemo: () => void;
  onAddPhrase: (text: string, family: string, kind?: 'feeling' | 'desire' | 'pass') => void;
}

const QUICK_CHIPS = [
  { text: "тревога", family: "тревога", label: "тревожно", kind: "feeling" as const },
  { text: "замедление", family: "спокойствие", label: "замедление", kind: "feeling" as const },
  { text: "тепло", family: "нежность", label: "тепло", kind: "feeling" as const },
  { text: "усталость", family: "усталость", label: "устал", kind: "feeling" as const },
  { text: "тишины", family: "спокойствие", label: "тишины", kind: "desire" as const },
  { text: "пас", family: "", label: "пас", kind: "pass" as const },
];

export const SalonControls: React.FC<SalonControlsProps> = ({
  phase,
  isAudioOn,
  isListening = false,
  isDemoActive,
  engineStatus,
  onPhaseSelect,
  onAudioToggle,
  onSpeechToggle,
  onInputToggle,
  onTriggerTurn,
  onToggleDemo,
  onAddPhrase,
}) => {
  return (
    <div className="flex flex-col gap-2 p-3 bg-[#090807]/80 backdrop-blur-md border border-primary/20 rounded-[2px] font-mono text-[11px] shadow-2xl select-none">
      <div className="flex items-center flex-wrap gap-2">
        <button
          onClick={onTriggerTurn}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-bold border border-primary rounded-[2px] cursor-pointer hover:bg-primary/90 transition-colors"
        >
          <span className="text-[10px] opacity-80">space</span>
          <span>реплика в круг</span>
        </button>

        <button
          onClick={onToggleDemo}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-[2px] cursor-pointer transition-colors",
            isDemoActive
              ? "bg-primary/20 text-primary border-primary font-semibold"
              : "border-border text-foreground hover:bg-secondary"
          )}
        >
          {isDemoActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span>живой круг</span>
        </button>

        <button
          onClick={onAudioToggle}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-[2px] cursor-pointer transition-colors",
            isAudioOn
              ? "bg-primary/20 text-primary border-primary"
              : "border-border text-muted hover:text-foreground hover:bg-secondary"
          )}
        >
          {isAudioOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>звук (m)</span>
        </button>

        {onSpeechToggle && (
          <button
            onClick={onSpeechToggle}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-[2px] cursor-pointer transition-colors",
              isListening
                ? "bg-primary/20 text-primary border-primary font-semibold shadow-sm shadow-primary/20"
                : "border-border text-muted hover:text-foreground hover:bg-secondary"
            )}
          >
            {isListening ? <Mic className="w-3.5 h-3.5 text-primary" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>голос (v)</span>
          </button>
        )}

        {onInputToggle && (
          <button
            onClick={onInputToggle}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-[2px] cursor-pointer hover:bg-secondary text-foreground transition-colors"
          >
            <span>текст (enter)</span>
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                engineStatus?.hasModel ? "bg-[#34d399]" : "bg-[#ffb266]"
              )}
            />
          </button>
        )}

        <div className="flex gap-1 ml-1">
          {(["silence", "feelings", "desires", "completion"] as SessionPhase[]).map((p, idx) => (
            <button
              key={p}
              onClick={() => onPhaseSelect(p)}
              className={cn(
                "px-2 py-1 text-[10px] border rounded-[2px] cursor-pointer transition-colors",
                phase === p
                  ? "bg-primary text-primary-foreground font-bold border-primary"
                  : "border-border text-muted hover:text-foreground"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <span className="text-[10px] text-muted mr-1">в общее поле:</span>
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.text}
              onClick={() => onAddPhrase(chip.text, chip.family, chip.kind)}
              className="px-2 py-0.5 text-[10px] border border-border/80 bg-[#100d0a] text-muted hover:text-primary hover:border-primary/60 rounded-[2px] transition-colors cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted pt-1.5 border-t border-border/40">
        <div>
          <kbd className="px-1 py-0.5 bg-[#15110d] border border-border rounded-[2px] text-foreground">space</kbd> реплика
          · слова остывают до 10% · клик по точке — сесть
        </div>
        <div className="flex gap-2">
          <span><kbd className="px-1 py-0.5 bg-[#15110d] border border-border rounded-[2px] text-foreground">h</kbd> зен-режим</span>
          <span><kbd className="px-1 py-0.5 bg-[#15110d] border border-border rounded-[2px] text-foreground">f</kbd> полный экран</span>
        </div>
      </div>
    </div>
  );
};
