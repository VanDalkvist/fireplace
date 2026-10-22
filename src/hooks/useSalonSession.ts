import { useState, useCallback, useRef } from "react";
import {
  createInitialState,
  setPhase,
  nextSpeaker,
  passTurn,
  setSpeaker,
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
  const demoIdxRef = useRef(0);
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
        const withSpeaker = setSpeaker(prev, speakerId);
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
        const withSpeaker = setSpeaker(prev, speakerId);
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
    const idx = demoIdxRef.current;
    demoIdxRef.current += 1;
    const item = DEMO_PHRASES[idx % DEMO_PHRASES.length];

    if (item.isPass) {
      audioRef.current?.playPass();
      setState((prev: SessionState) => {
        const currId = prev.activeSpeakerId ?? 1;
        return passTurn(prev, currId);
      });
      return;
    }

    if (item.desire) {
      audioRef.current?.playDesire();
      setState((prev: SessionState) => {
        const currId = prev.activeSpeakerId ?? 1;
        const candidates = [1, 2, 3, 4, 5, 6, 7, 8].filter((id) => id !== currId);
        const nextId = candidates[Math.floor(Math.random() * candidates.length)];
        const withSpeaker = setSpeaker(prev, nextId);
        return addDesireToken(withSpeaker, {
          id: `desire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: item.desire || "",
          object: item.desire || "",
          who: "",
          speakerId: nextId,
          timestamp: Date.now(),
        });
      });
      return;
    }

    if (item.family) {
      audioRef.current?.playFeeling(item.family, item.valence ?? 0);
      setState((prev: SessionState) => {
        const currId = prev.activeSpeakerId ?? 1;
        const candidates = [1, 2, 3, 4, 5, 6, 7, 8].filter((id) => id !== currId);
        const nextId = candidates[Math.floor(Math.random() * candidates.length)];
        const withSpeaker = setSpeaker(prev, nextId);
        return addFeelingToken(withSpeaker, {
          id: `feel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: item.text || "",
          lemma: item.text || "",
          family: item.family || "живость",
          valence: item.valence ?? 0,
          arousal: 0.5,
          intensity: 1.2,
          speakerId: nextId,
          timestamp: Date.now(),
        });
      });
    }
  }, []);

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
    demoIdx: demoIdxRef.current,
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
