import { useState, useCallback, useRef } from "react";
import {
  createInitialState,
  setPhase,
  nextSpeaker,
  passTurn,
  setSpeaker,
  ensureParticipant,
  resetParticipants,
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
  handleResetCircle: () => void;
}

export function useSalonSession(): UseSalonSessionReturn {
  const [state, setState] = useState<SessionState>(() => createInitialState(0));
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
      audioRef.current?.playFeeling(family, valence);
      setState((prev: SessionState) => {
        const speakerId = spkId ?? prev.activeSpeakerId ?? 1;
        const ensured = ensureParticipant(prev, speakerId);
        const withSpeaker: SessionState = {
          ...ensured,
          activeSpeakerId: speakerId,
          participants: ensured.participants.map((p) => ({ ...p, isSpeaking: p.id === speakerId })),
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
    []
  );

  const handleAddDesire = useCallback(
    (desireText: string, spkId?: number) => {
      audioRef.current?.playDesire();
      setState((prev: SessionState) => {
        const speakerId = spkId ?? prev.activeSpeakerId ?? 1;
        const ensured = ensureParticipant(prev, speakerId);
        const withSpeaker: SessionState = {
          ...ensured,
          activeSpeakerId: speakerId,
          participants: ensured.participants.map((p) => ({ ...p, isSpeaking: p.id === speakerId })),
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
    []
  );

  const handlePass = useCallback(() => {
    setState((prev: SessionState) => {
      const speakerId = prev.activeSpeakerId ?? 1;
      audioRef.current?.playPass();
      return passTurn(prev, speakerId);
    });
  }, []);

  const handleAdvanceTurn = useCallback(() => {
    setState((prev: SessionState) => nextSpeaker(prev));
  }, []);

  const triggerNextTurn = useCallback(() => {
    setState((prev: SessionState) => {
      const item = DEMO_PHRASES[demoIdx % DEMO_PHRASES.length];
      setDemoIdx((d) => d + 1);
      const currId = prev.activeSpeakerId ?? 1;
      const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((id) => id !== currId);
      const nextId = candidates[Math.floor(Math.random() * candidates.length)];

      if (item.isPass) {
        audioRef.current?.playPass();
        return passTurn(prev, currId);
      }
      if (item.desire) {
        audioRef.current?.playDesire();
        const ensured = ensureParticipant(prev, nextId);
        const withSpeaker: SessionState = {
          ...ensured,
          activeSpeakerId: nextId,
          participants: ensured.participants.map((p) => ({ ...p, isSpeaking: p.id === nextId })),
        };
        return addDesireToken(withSpeaker, {
          id: `desire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: item.desire,
          object: item.desire,
          who: "",
          speakerId: nextId,
          timestamp: Date.now(),
        });
      }
      if (item.family) {
        audioRef.current?.playFeeling(item.family, item.valence ?? 0);
        const ensured = ensureParticipant(prev, nextId);
        const withSpeaker: SessionState = {
          ...ensured,
          activeSpeakerId: nextId,
          participants: ensured.participants.map((p) => ({ ...p, isSpeaking: p.id === nextId })),
        };
        return addFeelingToken(withSpeaker, {
          id: `feel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: item.text,
          lemma: item.text,
          family: item.family,
          valence: item.valence ?? 0,
          arousal: 0.5,
          intensity: 1.2,
          speakerId: nextId,
          timestamp: Date.now(),
        });
      }
      return prev;
    });
  }, [demoIdx]);

  const handleSelectSpeaker = useCallback((speakerId: number) => {
    setState((prev: SessionState) => setSpeaker(prev, speakerId));
  }, []);

  const handleResetCircle = useCallback(() => {
    setState((prev: SessionState) => resetParticipants(prev));
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
    handleResetCircle,
  };
}
