import React from "react";
import type { SessionPhase } from "@/domain/types";
import type { SpeechEnginePort } from "@/speech/speech-types";
import type { SalonAudioEngine } from "@/audio/audio-engine";
import { SalonPult } from "./SalonPult";
import { IntroDialog } from "./IntroDialog";
import { AnalyticsModal } from "./AnalyticsModal";

interface SalonModalsProps {
  isPultOpen: boolean;
  setIsPultOpen: (open: boolean) => void;
  isIntroOpen: boolean;
  setIsIntroOpen: (open: boolean) => void;
  isAnalyticsOpen: boolean;
  setIsAnalyticsOpen: (open: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;
  phase: SessionPhase;
  isDemoActive: boolean;
  setIsDemoActive: (active: boolean | ((prev: boolean) => boolean)) => void;
  isListening: boolean;
  audioEngine: SalonAudioEngine | null;
  speechEngine: SpeechEnginePort | null;
  onPhaseChange: (p: SessionPhase) => void;
  onNextSpeaker: () => void;
  onPass: () => void;
  onTriggerDemoPhrase: () => void;
  onEnterCircleAudio: () => void;
}

export const SalonModals: React.FC<SalonModalsProps> = ({
  isPultOpen,
  setIsPultOpen,
  isIntroOpen,
  setIsIntroOpen,
  isAnalyticsOpen,
  setIsAnalyticsOpen,
  volume,
  setVolume,
  phase,
  isDemoActive,
  setIsDemoActive,
  isListening,
  audioEngine,
  speechEngine,
  onPhaseChange,
  onNextSpeaker,
  onPass,
  onTriggerDemoPhrase,
  onEnterCircleAudio,
}) => {
  return (
    <>
      <SalonPult
        open={isPultOpen}
        onOpenChange={setIsPultOpen}
        volume={volume}
        onVolumeChange={(v) => {
          setVolume(v);
          audioEngine?.setVolume(v);
        }}
        phase={phase}
        onPhaseChange={onPhaseChange}
        onNextSpeaker={onNextSpeaker}
        onPass={onPass}
        onTriggerDemoPhrase={onTriggerDemoPhrase}
        onToggleDemoMode={() => setIsDemoActive((prev) => !prev)}
        isDemoActive={isDemoActive}
        isListening={isListening}
        onToggleListening={() => speechEngine?.toggle()}
        isSpeechSupported={speechEngine?.isSupported()}
      />

      <IntroDialog
        open={isIntroOpen}
        onOpenChange={setIsIntroOpen}
        onEnterCircle={() => {
          setIsIntroOpen(false);
          onEnterCircleAudio();
        }}
      />

      <AnalyticsModal
        open={isAnalyticsOpen}
        onOpenChange={setIsAnalyticsOpen}
      />
    </>
  );
};
