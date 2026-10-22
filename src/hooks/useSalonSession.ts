import { useState, useCallback, useRef } from "react";
import {
  createInitialState,
  setPhase,
  nextSpeaker,
  passTurn,
  setSpeaker,
  addFeelingToken,
  addDesireToken,
} from "@/domain/session-fsm";
import type { SessionState, SessionPhase } from "@/domain/types";
import { DEMO_PHRASES } from "@/domain/demo-script";
import { SalonAudioEngine } from "@/audio/audio-engine";

export interface UseSalonSessionReturn {
  state: SessionState;
  audioRef: React.MutableRefObject<SalonAudioEngine | null>;
  isAudioOn: boolean;
  demoIdx: number;
  handlePhaseSelect: (phase: SessionPhase) => void;
  handleAudioToggle: () => void;
  handleAddFeeling: (text: string, family?: string, valence?: number, speakerId?: number) => void;
  handleAddDesire: (text: string, speakerId?: number) => void;
  handlePass: () => void;
  handleAdvanceTurn: () => void;
  triggerNextTurn: () => void;
  handleSelectSpeaker: (speakerId: number) => void;
}

export function useSalonSession(): UseSalonSessionReturn {
  const [state, setState] = useState<SessionState>(() => createInitialState(12));
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);
  const audioRef = useRef<SalonAudioEngine | null>(null);

  if (!audioRef.current && typeof window !== "undefined") {
    audioRef.current = new SalonAudioEngine();
  }

  const handleAudioToggle = useCallback(() => {
    if (!audioRef.current) return;
    const next = audioRef.current.toggle();
    setIsAudioOn(next);
  }, []);

  const handlePhaseSelect = useCallback((phase: SessionPhase) => {
    setState((prev: SessionState) => setPhase(prev, phase));
  }, []);

  const handleAddFeeling = useCallback(
    (phrase: string, family = "живость", valence = 0, spkId?: number) => {
      const speakerId = spkId ?? state.activeSpeakerId ?? 1;
      audioRef.current?.playFeeling(family, valence);
      setState((prev: SessionState) => {
        const withSpeaker: SessionState = {
          ...prev,
          activeSpeakerId: speakerId,
          participants: prev.participants.map((p) => ({ ...p, isSpeaking: p.id === speakerId })),
        };
        return addFeelingToken(withSpeaker, {
          id: `feel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: phrase,
          lemma: phrase,
          family,
          valence,
          arousal: 0.5,
          intensity: 1.2,
          speakerId,
          timestamp: Date.now(),
        });
      });
    },
    [state.activeSpeakerId]
  );

  const handleAddDesire = useCallback(
    (desireText: string, spkId?: number) => {
      const speakerId = spkId ?? state.activeSpeakerId ?? 1;
      audioRef.current?.playDesire();
      setState((prev: SessionState) => {
        const withSpeaker: SessionState = {
          ...prev,
          activeSpeakerId: speakerId,
          participants: prev.participants.map((p) => ({ ...p, isSpeaking: p.id === speakerId })),
        };
        return addDesireToken(withSpeaker, {
          id: `desire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: desireText,
          object: desireText,
          who: "",
          speakerId,
          timestamp: Date.now(),
        });
      });
    },
    [state.activeSpeakerId]
  );

  const handlePass = useCallback(() => {
    const speakerId = state.activeSpeakerId ?? 1;
    audioRef.current?.playPass();
    setState((prev: SessionState) => passTurn(prev, speakerId));
  }, [state.activeSpeakerId]);

  const handleAdvanceTurn = useCallback(() => {
    setState((prev: SessionState) => nextSpeaker(prev));
  }, []);

  const triggerNextTurn = useCallback(() => {
    const item = DEMO_PHRASES[demoIdx % DEMO_PHRASES.length];
    setDemoIdx((prev) => prev + 1);
    const currId = state.activeSpeakerId ?? 1;
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((id) => id !== currId);
    const nextId = candidates[Math.floor(Math.random() * candidates.length)];

    if (item.isPass) {
      handlePass();
    } else if (item.desire) {
      handleAddDesire(item.desire, nextId);
    } else if (item.family) {
      handleAddFeeling(item.text, item.family, item.valence ?? 0, nextId);
    }
  }, [demoIdx, state.activeSpeakerId, handlePass, handleAddDesire, handleAddFeeling]);

  const handleSelectSpeaker = useCallback((speakerId: number) => {
    setState((prev: SessionState) => setSpeaker(prev, speakerId));
  }, []);

  return {
    state,
    audioRef,
    isAudioOn,
    demoIdx,
    handlePhaseSelect,
    handleAudioToggle,
    handleAddFeeling,
    handleAddDesire,
    handlePass,
    handleAdvanceTurn,
    triggerNextTurn,
    handleSelectSpeaker,
  };
}
