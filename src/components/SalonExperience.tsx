import React, { useEffect, useRef, useCallback } from "react";
import { SalonMotionEngine } from "@/canvas/motion-engine";
import { useSalonSession } from "@/hooks/useSalonSession";
import { useSalonUiState } from "@/hooks/useSalonUiState";
import { useSalonSpeech } from "@/hooks/useSalonSpeech";
import { useSalonCanvas } from "@/hooks/useSalonCanvas";
import { useSalonHotkeys } from "@/hooks/useSalonHotkeys";
import { SalonHeader } from "./salon/SalonHeader";
import { TechnicalGearPult } from "./salon/TechnicalGearPult";
import { CircleRules } from "./salon/CircleRules";
import { SalonModals } from "./salon/SalonModals";
import { VoiceIndicator } from "./salon/VoiceIndicator";
import { cn } from "@/lib/utils";
import { distillPhrase } from "@/composition/distillers";

export const SalonExperience: React.FC = () => {
  const {
    state,
    audioRef,
    isAudioOn,
    handlePhaseSelect,
    handleAudioToggle,
    handleAddFeeling,
    handleAddDesire,
    handleUpdateFeeling,
    handleUpdateDesire,
    handlePass,
    handleAdvanceTurn,
    triggerNextTurn,
    handleSelectSpeaker,
    handleResetCircle,
  } = useSalonSession();

  const {
    isPultOpen,
    setIsPultOpen,
    isIntroOpen,
    setIsIntroOpen,
    isAnalyticsOpen,
    setIsAnalyticsOpen,
    isZen,
    setIsZen,
    isVerbatimMode,
    setIsVerbatimMode,
    volume,
    setVolume,
    sttEngine,
    setSttEngine,
    distillerEngine,
    toggleDistillerEngine,
    isDemoActive,
    setIsDemoActive,
  } = useSalonUiState();

  const {
    isListening,
    isMeetingConnected,
    audioLevel,
    pipelineStatus,
    lastPhrase,
    interimPhrase,
    interimBadge,
    speechError,
    speechRef,
    resetVoiceprints,
  } = useSalonSpeech({
    distillPhrase,
    sttEngine,
    distillerEngine,
    phase: state.phase,
    audioRef,
    isVerbatimMode,
    onPass: handlePass,
    onAddFeeling: handleAddFeeling,
    onAddDesire: handleAddDesire,
    onUpdateFeeling: handleUpdateFeeling,
    onUpdateDesire: handleUpdateDesire,
    onSelectSpeaker: handleSelectSpeaker,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const motionRef = useRef<SalonMotionEngine | null>(null);

  if (!motionRef.current) motionRef.current = new SalonMotionEngine();

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !motionRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const seatId = motionRef.current.getSeatAtPoint((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr);
    if (seatId !== null) {
      speechRef.current?.flush();
      handleSelectSpeaker(seatId);
    }
  }, [handleSelectSpeaker, speechRef]);

  useSalonHotkeys({
    onTogglePult: () => setIsPultOpen((p) => !p),
    onToggleHelp: () => setIsIntroOpen((p) => !p),
    onToggleZen: () => setIsZen((p) => !p),
    onToggleFullscreen: () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn("[SalonExperience] requestFullscreen failed:", err);
        });
      } else {
        document.exitFullscreen?.().catch((err) => {
          console.warn("[SalonExperience] exitFullscreen failed:", err);
        });
      }
    },
    onTriggerTurn: triggerNextTurn,
    onPass: handlePass,
    onToggleAudio: handleAudioToggle,
    onToggleSpeech: () => speechRef.current?.toggle(),
    onAdvanceTurn: handleAdvanceTurn,
    onSelectPhase: handlePhaseSelect,
  });

  useEffect(() => {
    if (!isDemoActive) return;
    const timer = setInterval(triggerNextTurn, 5500);
    return () => clearInterval(timer);
  }, [isDemoActive, triggerNextTurn]);

  useSalonCanvas(canvasRef, motionRef, state);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background text-foreground select-none">
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="fixed inset-0 z-0 block w-full h-full cursor-default" />

      {/* Floating Header & Top Controls */}
      <div className={cn("fixed top-3 left-4 right-4 z-10 flex items-center justify-between transition-all duration-300 pointer-events-none", isZen && "-translate-y-4 opacity-0")}>
        <SalonHeader />
        <div className="flex items-center gap-2 pointer-events-auto">
          <TechnicalGearPult
            sttEngine={sttEngine}
            onToggleSttEngine={() =>
              setSttEngine((prev) => (prev === "gigaam" ? "whisper" : prev === "whisper" ? "google" : "gigaam"))
            }
            distillerEngine={distillerEngine}
            onToggleDistillerEngine={toggleDistillerEngine}
            isVerbatimMode={isVerbatimMode}
            onToggleVerbatimMode={() => setIsVerbatimMode((prev) => !prev)}
            isAudioOn={isAudioOn}
            onAudioToggle={handleAudioToggle}
            phase={state.phase}
            onPhaseSelect={handlePhaseSelect}
            isDemoActive={isDemoActive}
            onToggleDemo={() => setIsDemoActive((prev) => !prev)}
            onResetCircle={() => {
              resetVoiceprints();
              handleResetCircle();
            }}
          />
          <CircleRules />
        </div>
      </div>

      {/* Floating Bottom HUD */}
      <div className={cn("fixed bottom-4 left-4 right-4 z-10 flex flex-col items-center gap-2.5 transition-all duration-300", isZen && "translate-y-4 opacity-0 pointer-events-none")}>
        <VoiceIndicator
          isListening={isListening}
          audioLevel={audioLevel}
          pipelineStatus={pipelineStatus}
          lastPhraseText={lastPhrase}
          interimText={interimPhrase}
          interimBadge={interimBadge}
          errorMessage={speechError}
          engineType={sttEngine}
          isMeetingAudio={isMeetingConnected}
          onToggleListening={() => speechRef.current?.toggle()}
          isSupported={speechRef.current?.isSupported()}
        />
      </div>

      <SalonModals
        isPultOpen={isPultOpen}
        setIsPultOpen={setIsPultOpen}
        isIntroOpen={isIntroOpen}
        setIsIntroOpen={setIsIntroOpen}
        isAnalyticsOpen={isAnalyticsOpen}
        setIsAnalyticsOpen={setIsAnalyticsOpen}
        isVerbatimMode={isVerbatimMode}
        onToggleVerbatimMode={(val) => setIsVerbatimMode(val)}
        volume={volume}
        setVolume={setVolume}
        phase={state.phase}
        isDemoActive={isDemoActive}
        setIsDemoActive={setIsDemoActive}
        isListening={isListening}
        audioEngine={audioRef.current}
        speechEngine={speechRef.current}
        onPhaseChange={handlePhaseSelect}
        onNextSpeaker={handleAdvanceTurn}
        onPass={handlePass}
        onTriggerDemoPhrase={triggerNextTurn}
        onEnterCircleAudio={() => {
          if (!isAudioOn) handleAudioToggle();
        }}
      />
    </div>
  );
};
