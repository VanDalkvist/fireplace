import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import type { SessionPhase } from "@/domain/types";
import { Play, SkipForward, Ban, Sparkles, Mic, MicOff } from "lucide-react";

interface SalonPultProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  phase: SessionPhase;
  onPhaseChange: (phase: SessionPhase) => void;
  onNextSpeaker: () => void;
  onPass: () => void;
  onTriggerDemoPhrase: () => void;
  onToggleDemoMode: () => void;
  isDemoActive: boolean;
  isVerbatimMode?: boolean;
  onToggleVerbatimMode?: (enabled: boolean) => void;
  isListening?: boolean;
  onToggleListening?: () => void;
  isSpeechSupported?: boolean;
}

export const SalonPult: React.FC<SalonPultProps> = ({
  open,
  onOpenChange,
  volume,
  onVolumeChange,
  phase,
  onPhaseChange,
  onNextSpeaker,
  onPass,
  onTriggerDemoPhrase,
  onToggleDemoMode,
  isDemoActive,
  isVerbatimMode = false,
  onToggleVerbatimMode,
  isListening = false,
  onToggleListening,
  isSpeechSupported = true,
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-baseline justify-between border-b border-border/80 pb-3">
            <h2 className="text-sm font-semibold tracking-wide text-foreground">
              пульт сессии
            </h2>
            <span className="text-[10px] text-muted uppercase tracking-wider">s1 · salon</span>
          </div>
        </SheetHeader>

        <div className="space-y-6 text-xs font-mono">
          {/* Audio volume */}
          <div className="space-y-2">
            <div className="flex justify-between text-muted">
              <span>громкость d dorian</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <Slider
              value={[volume]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(val) => onVolumeChange(val[0])}
            />
          </div>

          {/* Phases selector */}
          <div className="space-y-2 border-t border-border/50 pt-4">
            <label className="text-muted block">фаза практики</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(["silence", "feelings", "desires", "completion"] as SessionPhase[]).map((p) => (
                <Button
                  key={p}
                  variant={phase === p ? "primary" : "outline"}
                  size="sm"
                  className="text-[11px]"
                  onClick={() => onPhaseChange(p)}
                >
                  {p === "silence" ? "начало" : p}
                </Button>
              ))}
            </div>
          </div>

          {/* Speaker Turn Controls */}
          <div className="space-y-2 border-t border-border/50 pt-4">
            <label className="text-muted block">эстафета круга</label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="default" size="sm" onClick={onNextSpeaker}>
                <SkipForward className="w-3.5 h-3.5 mr-1 text-primary" />
                следующий
              </Button>
              <Button variant="outline" size="sm" onClick={onPass}>
                <Ban className="w-3.5 h-3.5 mr-1 text-destructive" />
                пас
              </Button>
            </div>
          </div>

          {/* Voice Recognition Controls */}
          <div className="space-y-2 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-muted block">распознавание речи</label>
              <span className="text-[10px] text-primary">
                {isListening ? "● слушает" : "○ выключен"}
              </span>
            </div>
            {isSpeechSupported ? (
              <Button
                variant={isListening ? "primary" : "outline"}
                size="sm"
                className="w-full text-[11px]"
                onClick={onToggleListening}
              >
                {isListening ? (
                  <>
                    <Mic className="w-3.5 h-3.5 mr-1.5" />
                    остановить микрофон (v)
                  </>
                ) : (
                  <>
                    <MicOff className="w-3.5 h-3.5 mr-1.5" />
                    включить микрофон (v)
                  </>
                )}
              </Button>
            ) : (
              <p className="text-[10px] text-destructive/80">
                браузер не поддерживает speech recognition api
              </p>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-[11px]"
              onClick={onTriggerDemoPhrase}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
              эмулировать фразу говорящего
            </Button>
          </div>

          {/* Phrase Mode: Verbatim vs Distilled */}
          <div className="space-y-2 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-muted block">отображение фраз</label>
              <span className="text-[10px] text-primary">
                {isVerbatimMode ? "фраза" : "нейро"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant={!isVerbatimMode ? "primary" : "outline"}
                size="sm"
                className="text-[11px]"
                onClick={() => onToggleVerbatimMode?.(false)}
              >
                нейро
              </Button>
              <Button
                variant={isVerbatimMode ? "primary" : "outline"}
                size="sm"
                className="text-[11px]"
                onClick={() => onToggleVerbatimMode?.(true)}
              >
                фраза
              </Button>
            </div>
            <p className="text-[10px] text-muted/70 leading-normal">
              {isVerbatimMode
                ? "фраза показывается в круге полностью без сокращений"
                : "смысловые фразы выделяет выбранная нейромодель"}
            </p>
          </div>

          {/* 4-Minute Demo Mode */}
          <div className="space-y-2 border-t border-border/50 pt-4">
            <label className="text-muted block">демо-симуляция</label>
            <Button
              variant={isDemoActive ? "primary" : "outline"}
              size="sm"
              className="w-full"
              onClick={onToggleDemoMode}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {isDemoActive ? "остановить демо" : "запустить 4-мин демо (?demo=1)"}
            </Button>
          </div>

          {/* Hotkey Guide */}
          <div className="border-t border-border/50 pt-4 text-[10px] text-muted/60 space-y-1">
            <div><kbd className="text-foreground">1..4</kbd> — переключение фаз</div>
            <div><kbd className="text-foreground">space</kbd> — пауза / эстафета</div>
            <div><kbd className="text-foreground">v</kbd> — микрофон on / off</div>
            <div><kbd className="text-foreground">p</kbd> — передать пас</div>
            <div><kbd className="text-foreground">m</kbd> — включить/выключить звук</div>
            <div><kbd className="text-foreground">tab</kbd> — открыть/закрыть этот пульт</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
