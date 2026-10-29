import { useState, useCallback, useRef, useEffect } from "react";
import {
  createInitialState,
  setPhase,
  advancePhase,
  nextSpeaker,
  passTurn,
  setSpeaker,
  resetParticipants,
  addFeelingToken,
  addDesireToken,
  updateFeelingToken,
  updateDesireToken,
} from "@/domain/session-fsm";
import type { SessionState, SessionPhase } from "@/domain/types";
import { getDemoPhrasesForPhase } from "@/domain/demo-script";
import { SalonAudioEngine } from "@/audio/audio-engine";
import { useSalonAudio } from "./useSalonAudio";
import { useFireRecording } from "./useFireRecording";
import {
  loadSessionPersistence,
  saveSessionPersistence,
  clearAllSalonPersistence,
} from "@/infrastructure/salon-persistence";
import { getPersistedSessionAnalytics } from "@/domain/session-analytics";

export interface UseSalonSessionReturn {
  state: SessionState;
  audioRef: React.MutableRefObject<SalonAudioEngine | null>;
  isAudioOn: boolean;
  audioError: string | null;
  recordingLabel: string;
  recordingPosition: string;
  cycleRecording: () => void;
  demoIdx: number;
  handlePhaseSelect: (phase: SessionPhase) => void;
  handleAdvancePhase: () => void;
  handleAudioToggle: () => void;
  handleAddFeeling: (text: string, family?: string, valence?: number, speakerId?: number) => string;
  handleAddDesire: (text: string, speakerId?: number) => string;
  handleUpdateFeeling: (id: string, text: string, family?: string, valence?: number) => void;
  handleUpdateDesire: (id: string, text: string) => void;
  handlePass: () => void;
  handleAdvanceTurn: () => void;
  triggerNextTurn: () => void;
  handleSelectSpeaker: (speakerId: number | null) => void;
  handleResetCircle: () => void;
}

export function useSalonSession(): UseSalonSessionReturn {
  const [state, setState] = useState<SessionState>(() => {
    const persisted = loadSessionPersistence();
    return persisted?.session || createInitialState(0);
  });
  const demoIdxRef = useRef(0);
  const phaseRef = useRef<SessionPhase>(state.phase);
  phaseRef.current = state.phase;
  const audioRef = useRef<SalonAudioEngine | null>(null);
  const { recordingId, recordingLabel, recordingPosition, cycleRecording } = useFireRecording(audioRef);
  const { isAudioOn, audioError, handleAudioToggle } = useSalonAudio(audioRef, recordingId);

  useEffect(() => {
    saveSessionPersistence(state, 0.0);
    if (typeof window !== "undefined") {
      (window as unknown as { __getSalonAnalytics: typeof getPersistedSessionAnalytics }).__getSalonAnalytics =
        getPersistedSessionAnalytics;
    }
  }, [state]);

  const handleAdvancePhase = useCallback(() => {
    setState((previous: SessionState) => advancePhase(previous));
  }, []);

  const handlePhaseSelect = useCallback((phase: SessionPhase) => {
    setState((prev: SessionState) => setPhase(prev, phase));
  }, []);

  const handleAddFeeling = useCallback(
    (phrase: string, family = "живость", valence = 0, spkId?: number): string => {
      const tokenId = `feel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      audioRef.current?.playFeeling(family, valence);
      setState((prev: SessionState) => {
        const speakerId = spkId ?? prev.activeSpeakerId ?? 1;
        const withSpeaker = setSpeaker(prev, speakerId);
        return addFeelingToken(withSpeaker, {
          id: tokenId,
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
      return tokenId;
    },
    []
  );

  const handleAddDesire = useCallback(
    (desireText: string, spkId?: number): string => {
      const tokenId = `desire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      audioRef.current?.playDesire();
      setState((prev: SessionState) => {
        const speakerId = spkId ?? prev.activeSpeakerId ?? 1;
        const withSpeaker = setSpeaker(prev, speakerId);
        return addDesireToken(withSpeaker, {
          id: tokenId,
          text: desireText,
          object: desireText,
          who: "",
          speakerId,
          timestamp: Date.now(),
        });
      });
      return tokenId;
    },
    []
  );

  const handleUpdateFeeling = useCallback(
    (id: string, phrase: string, family?: string, valence?: number) => {
      setState((prev: SessionState) => updateFeelingToken(prev, id, phrase, family, valence));
    },
    []
  );

  const handleUpdateDesire = useCallback(
    (id: string, phrase: string) => {
      setState((prev: SessionState) => updateDesireToken(prev, id, phrase));
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
    const currentPhase = phaseRef.current;
    const phrases = getDemoPhrasesForPhase(currentPhase);
    const idx = demoIdxRef.current;
    demoIdxRef.current += 1;
    const item = phrases[idx % phrases.length];

    if (item.isPass) {
      audioRef.current?.playPass();
      setState((prev: SessionState) => {
        const nextId = item.speakerId ?? ((prev.activeSpeakerId ?? 1) % 12 + 1);
        const withSpeaker = setSpeaker(prev, nextId);
        return passTurn(withSpeaker, nextId);
      });
      return;
    }

    if (item.desire || currentPhase === "desires") {
      audioRef.current?.playDesire();
      setState((prev: SessionState) => {
        const currId = prev.activeSpeakerId ?? 1;
        const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((id) => id !== currId);
        const nextId = item.speakerId ?? candidates[Math.floor(Math.random() * candidates.length)];
        const withSpeaker = setSpeaker(prev, nextId);
        const desireText = item.desire || item.text || "тишина";
        return addDesireToken(withSpeaker, {
          id: `desire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: desireText,
          object: desireText,
          who: "",
          speakerId: nextId,
          timestamp: Date.now(),
        });
      });
      return;
    }

    const targetFamily = item.family || (currentPhase === "completion" ? "завершение" : "спокойствие");
    const targetValence = item.valence ?? (currentPhase === "completion" ? 0.9 : 0.7);

    audioRef.current?.playFeeling(targetFamily, targetValence);
    setState((prev: SessionState) => {
      const currId = prev.activeSpeakerId ?? 1;
      const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((id) => id !== currId);
      const nextId = item.speakerId ?? candidates[Math.floor(Math.random() * candidates.length)];
      const withSpeaker = setSpeaker(prev, nextId);
      return addFeelingToken(withSpeaker, {
        id: `feel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: item.text || "",
        lemma: item.text || "",
        family: targetFamily,
        valence: targetValence,
        arousal: 0.5,
        intensity: 1.2,
        speakerId: nextId,
        timestamp: Date.now(),
      });
    });
  }, []);

  const handleSelectSpeaker = useCallback((speakerId: number | null) => {
    setState((prev: SessionState) => setSpeaker(prev, speakerId));
  }, []);

  const handleResetCircle = useCallback(() => {
    clearAllSalonPersistence();
    setState((prev: SessionState) => ({
      ...resetParticipants(createInitialState(0)),
      phase: prev.phase,
    }));
  }, []);

  return {
    state,
    audioRef,
    isAudioOn,
    audioError,
    recordingLabel, recordingPosition, cycleRecording,
    demoIdx: demoIdxRef.current,
    handlePhaseSelect,
    handleAdvancePhase,
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
  };
}
