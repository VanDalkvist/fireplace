import React, { useEffect, useRef, useCallback } from "react";
import { SalonMotionEngine } from "@/canvas/motion-engine";
import { useSalonSession } from "@/hooks/useSalonSession";
import { useSalonUiState } from "@/hooks/useSalonUiState";
import { useSalonSpeech } from "@/hooks/useSalonSpeech";
import { useSalonCanvas } from "@/hooks/useSalonCanvas";
import { useSalonHotkeys } from "@/hooks/useSalonHotkeys";
import { SalonHeader } from "./salon/SalonHeader";
import { SalonControls } from "./salon/SalonControls";
import { SalonModals } from "./salon/SalonModals";
import { VoiceIndicator } from "./salon/VoiceIndicator";
import { cn } from "@/lib/utils";

export const SalonExperience: React.FC = () => {
  const {
    state,
    audioRef,
    isAudioOn,
    handlePhaseSelect,
    handleAudioToggle,
    handleAddFeeling,
    handleAddDesire,
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
    isZen,
    setIsZen,
    volume,
    setVolume,
    sttEngine,
    setSttEngine,
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
    handleToggleMeetingAudio,
    resetVoiceprints,
  } = useSalonSpeech({
    sttEngine,
    phase: state.phase,
    audioRef,
    onPass: handlePass,
    onAddFeeling: handleAddFeeling,
    onAddDesire: handleAddDesire,
    onSelectSpeaker: handleSelectSpeaker,
    onSwitchToWhisper: () => setSttEngine("whisper"),
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

      {/* Floating Header */}
      <div className={cn("fixed top-3 left-4 right-4 z-10 transition-all duration-300", isZen && "-translate-y-4 opacity-0 pointer-events-none")}>
        <SalonHeader
          phase={state.phase}
          isListening={isListening}
          isZen={isZen}
          onPhaseSelect={handlePhaseSelect}
          onToggleZen={() => setIsZen((prev) => !prev)}
          onOpenPult={() => setIsPultOpen(true)}
          onOpenHelp={() => setIsIntroOpen(true)}
        />
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
        <SalonControls
          phase={state.phase}
          isAudioOn={isAudioOn}
          isDemoActive={isDemoActive}
          isMeetingAudioConnected={isMeetingConnected}
          sttEngine={sttEngine}
          onToggleSttEngine={() =>
            setSttEngine((prev) => (prev === "gigaam" ? "whisper" : prev === "whisper" ? "google" : "gigaam"))
          }
          onResetVoiceprints={resetVoiceprints}
          onResetCircle={handleResetCircle}
          onToggleMeetingAudio={handleToggleMeetingAudio}
          onPhaseSelect={handlePhaseSelect}
          onAudioToggle={handleAudioToggle}
          onToggleDemo={() => setIsDemoActive((prev) => !prev)}
        />
      </div>

      <SalonModals
        isPultOpen={isPultOpen}
        setIsPultOpen={setIsPultOpen}
        isIntroOpen={isIntroOpen}
        setIsIntroOpen={setIsIntroOpen}
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
