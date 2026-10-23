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
import { DEMO_PHRASES } from "@/domain/demo-script";
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
