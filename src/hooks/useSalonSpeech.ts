import { useState, useRef, useEffect, useCallback } from "react";
import type { SessionPhase } from "@/domain/types";
import { isPureFillerPhrase } from "@/domain/lexicon-engine";
import type { EnrichedDistillationResult, NeuralDistillerOptions } from "@/domain/phrase-distiller";
import { SpeakerTurnBuffer } from "@/domain/speaker-turn-buffer";
import { createSpeechEngine } from "@/speech/speech-factory";
import type { SpeechEnginePort, SpeechEngineKind, SpeechPipelineStatus } from "@/speech/speech-types";
import type { SalonAudioEngine } from "@/audio/audio-engine";
import type { InterimBadge } from "@/components/salon/VoiceIndicator";
import { createSpeakerIdentifier } from "@/speaker/speaker-factory";
import { useMeetingAudio } from "@/hooks/useMeetingAudio";
import {
  stripHandoffWord,
  dispatchSubsumedToken,
  dispatchDistilledResult,
  type RecentTokenSnapshot,
} from "@/domain/token-subsumption";

interface UseSalonSpeechOptions {
  sttEngine: SpeechEngineKind;
  distillerEngine?: string;
  distillPhrase: (source: string, options: NeuralDistillerOptions, context: string[]) => Promise<EnrichedDistillationResult>;
  phase: SessionPhase;
  audioRef: React.MutableRefObject<SalonAudioEngine | null>;
  isVerbatimMode?: boolean;
  onPass: () => void;
  onAddFeeling: (text: string, family?: string, valence?: number, speakerId?: number) => void | string;
  onAddDesire: (text: string, speakerId?: number) => void | string;
  onUpdateFeeling?: (id: string, text: string, family?: string, valence?: number) => void;
  onUpdateDesire?: (id: string, text: string) => void;
  onSelectSpeaker?: (speakerId: number) => void;
}

export function useSalonSpeech({
  sttEngine,
  distillerEngine = "openrouter",
  phase,
  distillPhrase,
  audioRef,
  isVerbatimMode = false,
  onPass,
  onAddFeeling,
  onAddDesire,
  onUpdateFeeling,
  onUpdateDesire,
  onSelectSpeaker,
}: UseSalonSpeechOptions) {
  const isVoiceInit = typeof window !== "undefined" && window.location.search.includes("voice=1");
  const [isListening, setIsListening] = useState(isVoiceInit);
  const [audioLevel, setAudioLevel] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState<SpeechPipelineStatus>("idle");
  const [lastPhrase, setLastPhrase] = useState("тишина у огня");
  const [interimPhrase, setInterimPhrase] = useState(isVoiceInit ? "я чувствую замедление" : "");
  const [interimBadge, setInterimBadge] = useState<InterimBadge | null>(
    isVoiceInit ? { text: "замедление", type: "feeling" } : null
  );
  const [identifiedSpeaker, setIdentifiedSpeaker] = useState<{
    seatNumber: number;
    speakerId: string;
  } | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const speechRef = useRef<SpeechEnginePort | null>(null);
  const speakerPort = useRef(createSpeakerIdentifier()).current;
  const wasListeningRef = useRef(false);

  // Stabilize callbacks against re-render cascades (AP-053, AP-054)
  const callbacksRef = useRef({ phase, distillPhrase, isVerbatimMode, distillerEngine, onPass, onAddFeeling, onAddDesire, onUpdateFeeling, onUpdateDesire, onSelectSpeaker });
  callbacksRef.current = { phase, distillPhrase, isVerbatimMode, distillerEngine, onPass, onAddFeeling, onAddDesire, onUpdateFeeling, onUpdateDesire, onSelectSpeaker };

  const { isMeetingConnected, toggleMeetingAudio } = useMeetingAudio({
    audioRef,
    speechRef,
    sttEngine,
    wasListeningRef,
    onError: (err) => setSpeechError(err),
  });

  const turnBufferRef = useRef(new SpeakerTurnBuffer(2200));
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakerDecayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedTokenRef = useRef<RecentTokenSnapshot | null>(null);

  useEffect(() => {
    turnBufferRef.current.clearHistory();
    setInterimPhrase(""); setInterimBadge(null);
    lastEmittedTokenRef.current = null;
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
  }, [phase]);

  const scheduleSpeakerDecay = useCallback(() => {
    if (speakerDecayTimerRef.current) clearTimeout(speakerDecayTimerRef.current);
    speakerDecayTimerRef.current = setTimeout(() => {
      callbacksRef.current.onSelectSpeaker?.(null as unknown as number);
      setIdentifiedSpeaker(null);
    }, 5000);
  }, []);

  const processCompletedTurn = useCallback(async (text: string, speakerSeat?: number) => {
    const cleanRaw = stripHandoffWord(text);
    if (!cleanRaw || isPureFillerPhrase(cleanRaw)) return;

    const { phase: curPhase, isVerbatimMode: isVerbatim, onPass: passFn } = callbacksRef.current;
    const spk = speakerSeat ?? 1;

    // Verbatim Mode: phrase is displayed directly without neural compression
    if (isVerbatim) {
      turnBufferRef.current.commitCompletedTurn(cleanRaw, speakerSeat);
      setLastPhrase(cleanRaw);
      setInterimPhrase("");
      setInterimBadge(null);
      lastEmittedTokenRef.current = dispatchSubsumedToken({
        phase: curPhase,
        clean: cleanRaw,
        speakerId: spk,
        recent: lastEmittedTokenRef.current,
        onAddFeeling: callbacksRef.current.onAddFeeling,
        onAddDesire: callbacksRef.current.onAddDesire,
        onUpdateFeeling: callbacksRef.current.onUpdateFeeling,
        onUpdateDesire: callbacksRef.current.onUpdateDesire,
      });
      if (speakerSeat) scheduleSpeakerDecay();
      return;
    }

    setInterimBadge({ text: "нейрокоррекция", type: curPhase === "desires" ? "desire" : "feeling" });
    const recentContext = turnBufferRef.current.getRecentHistory(3, speakerSeat);
    let res: EnrichedDistillationResult;
    try {
      res = await callbacksRef.current.distillPhrase(cleanRaw, { engine: callbacksRef.current.distillerEngine, phase: curPhase }, recentContext);
      setSpeechError(null);
    } catch (cause) {
      turnBufferRef.current.commitCompletedTurn(cleanRaw, speakerSeat);
      setLastPhrase(cleanRaw); setInterimPhrase(""); setInterimBadge(null);
      setSpeechError("Сжатие недоступно: настроенная цепочка адаптеров не сработала");
      console.warn("[SalonSpeech]", { event: "distillation_failed", type: cause instanceof Error ? cause.name : "unknown" });
      return;
    }
    if (callbacksRef.current.phase !== curPhase) return;
    const settled = stripHandoffWord(res.repairedText || cleanRaw);

    turnBufferRef.current.commitCompletedTurn(settled, speakerSeat);
    setLastPhrase(settled);
    setInterimPhrase("");
    setInterimBadge(null);

    if (res.pass) return passFn();

    lastEmittedTokenRef.current = dispatchDistilledResult(res, settled, {
      phase: curPhase,
      speakerId: spk,
      recent: lastEmittedTokenRef.current,
      onAddFeeling: callbacksRef.current.onAddFeeling,
      onAddDesire: callbacksRef.current.onAddDesire,
      onUpdateFeeling: callbacksRef.current.onUpdateFeeling,
      onUpdateDesire: callbacksRef.current.onUpdateDesire,
    });

    if (speakerSeat) scheduleSpeakerDecay();
  }, [scheduleSpeakerDecay]);

  const handleSpeechResult = useCallback((phrase: string, speakerSeat?: number) => {
    if (speakerSeat) {
      setIdentifiedSpeaker({ seatNumber: speakerSeat, speakerId: `seat_${speakerSeat}` });
      callbacksRef.current.onSelectSpeaker?.(speakerSeat);
    }

    setInterimPhrase(phrase);

    const feedRes = turnBufferRef.current.feed(phrase, speakerSeat);
    if (feedRes.flushedPrevious) {
      void processCompletedTurn(feedRes.flushedPrevious.text, feedRes.flushedPrevious.speakerSeat);
    }

    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    const timeoutGap = turnBufferRef.current.isDangling(phrase) ? 3500 : 2200;
    flushTimerRef.current = setTimeout(() => {
      const flushed = turnBufferRef.current.flush();
      if (flushed) {
        void processCompletedTurn(flushed.text, flushed.speakerSeat);
      }
    }, timeoutGap);
  }, [processCompletedTurn]);

  const handleToggleMeetingAudio = toggleMeetingAudio;

  useEffect(() => {
    const wasListening = isListening || wasListeningRef.current;
    void speechRef.current?.stop();
    speechRef.current = createSpeechEngine(sttEngine, {
      onInterimPhrase: (text) => {
        setInterimPhrase(text);
        setInterimBadge(text.toLowerCase().trim() === "пас" ? { text: "пас", type: "pass" } : null);
      },
      onFinalPhrase: handleSpeechResult,
      onError: (err) => setSpeechError(err),
      onAudioLevel: (lvl) => setAudioLevel(lvl),
      onPipelineStatus: (status) => setPipelineStatus(status),
      onStatusChange: (active) => {
        setIsListening(active);
        wasListeningRef.current = active;
        if (active) setSpeechError(null);
      },
    }, undefined, speakerPort);

    if (wasListening) {
      const meetingStream = isMeetingConnected && audioRef.current?.isMeetingAudioConnected
        ? audioRef.current.getMeetingStream() ?? undefined
        : undefined;
      void speechRef.current.start(undefined, meetingStream);
    }

    return () => {
      void speechRef.current?.stop();
    };
  }, [sttEngine, handleSpeechResult]);

  const resetVoiceprints = useCallback(async () => {
    const ok = await speakerPort.reset();
    if (ok) setIdentifiedSpeaker(null);
    return ok;
  }, [speakerPort]);

  return {
    isListening,
    isMeetingConnected,
    audioLevel,
    pipelineStatus,
    lastPhrase,
    interimPhrase,
    interimBadge,
    identifiedSpeaker,
    speechError,
    speechRef,
    handleSpeechResult,
    handleToggleMeetingAudio,
    resetVoiceprints,
  };
}
