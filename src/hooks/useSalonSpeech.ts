import { useState, useRef, useEffect, useCallback } from "react";
import type { SessionPhase } from "@/domain/types";
import { isPureFillerPhrase } from "@/domain/lexicon-engine";
import { distillWithNeuralFallback, splitIntoSemanticPhrases } from "@/domain/phrase-distiller";
import { SpeakerTurnBuffer } from "@/domain/speaker-turn-buffer";
import { defaultLexiconIndex } from "@/domain/lexicon-provider";
import { createSpeechEngine } from "@/speech/speech-factory";
import type { SpeechEnginePort, SpeechEngineKind, SpeechPipelineStatus } from "@/speech/speech-types";
import type { SalonAudioEngine } from "@/audio/audio-engine";
import type { InterimBadge } from "@/components/salon/VoiceIndicator";
import { createSpeakerIdentifier } from "@/speaker/speaker-factory";

interface UseSalonSpeechOptions {
  sttEngine: SpeechEngineKind;
  phase: SessionPhase;
  audioRef: React.MutableRefObject<SalonAudioEngine | null>;
  isVerbatimMode?: boolean;
  onPass: () => void;
  onAddFeeling: (text: string, family?: string, valence?: number, speakerId?: number) => void;
  onAddDesire: (text: string, speakerId?: number) => void;
  onSelectSpeaker?: (speakerId: number) => void;
  onSwitchToWhisper?: () => void;
}

export function useSalonSpeech({
  sttEngine,
  phase,
  audioRef,
  isVerbatimMode = false,
  onPass,
  onAddFeeling,
  onAddDesire,
  onSelectSpeaker,
  onSwitchToWhisper,
}: UseSalonSpeechOptions) {
  const isVoiceInit = typeof window !== "undefined" && window.location.search.includes("voice=1");
  const [isListening, setIsListening] = useState(isVoiceInit);
  const [isMeetingConnected, setIsMeetingConnected] = useState(false);
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

  // Stabilize callbacks against re-render cascades (AP-053, AP-054)
  const callbacksRef = useRef({ phase, isVerbatimMode, onPass, onAddFeeling, onAddDesire, onSelectSpeaker, onSwitchToWhisper });
  callbacksRef.current = { phase, isVerbatimMode, onPass, onAddFeeling, onAddDesire, onSelectSpeaker, onSwitchToWhisper };

  const turnBufferRef = useRef(new SpeakerTurnBuffer(2200));
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakerDecayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSpeakerDecay = useCallback(() => {
    if (speakerDecayTimerRef.current) clearTimeout(speakerDecayTimerRef.current);
    speakerDecayTimerRef.current = setTimeout(() => {
      callbacksRef.current.onSelectSpeaker?.(null as unknown as number);
      setIdentifiedSpeaker(null);
    }, 5000);
  }, []);

  const processCompletedTurn = useCallback(async (text: string, speakerSeat?: number) => {
    const { phase: curPhase, isVerbatimMode: isVerbatim, onPass: passFn, onAddFeeling: feelFn, onAddDesire: desireFn } = callbacksRef.current;

    // Verbatim Mode: phrase is displayed directly in full without neural or lexical compression!
    if (isVerbatim) {
      const clean = text.trim();
      if (!clean || isPureFillerPhrase(clean)) return;
      turnBufferRef.current.commitCompletedTurn(clean);
      setLastPhrase(clean);
      setInterimPhrase("");
      setInterimBadge(null);
      if (curPhase === "desires") desireFn(clean, speakerSeat);
      else feelFn(clean, "живость", 0, speakerSeat);
      if (speakerSeat) scheduleSpeakerDecay();
      return;
    }

    setInterimBadge({ text: "нейрокоррекция", type: "feeling" });
    const recentContext = turnBufferRef.current.getRecentHistory(3);
    const res = await distillWithNeuralFallback(text, defaultLexiconIndex, {}, recentContext);
    const settled = res.repairedText || text;

    turnBufferRef.current.commitCompletedTurn(settled);
    setLastPhrase(settled);
    setInterimPhrase("");
    setInterimBadge(null);

    if (res.pass) return passFn();

    let matched = false;
    for (const f of res.feelings) {
      for (const p of splitIntoSemanticPhrases(f.form || f.lemma)) {
        if (!isPureFillerPhrase(p)) { feelFn(p, f.family, f.valence, speakerSeat); matched = true; }
      }
    }
    for (const d of res.desires) {
      for (const p of splitIntoSemanticPhrases(d.text)) {
        if (!isPureFillerPhrase(p)) { desireFn(p, speakerSeat); matched = true; }
      }
    }
    if (!matched) {
      const clean = res.fallbackText || settled;
      if (isPureFillerPhrase(clean)) return;
      for (const p of splitIntoSemanticPhrases(clean)) {
        if (!isPureFillerPhrase(p)) {
          if (res.isDesirePhrase || curPhase === "desires") desireFn(p, speakerSeat);
          else feelFn(p, "живость", 0, speakerSeat);
        }
      }
    }
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

  const handleToggleMeetingAudio = useCallback(async () => {
    if (!audioRef.current) return;
    if (isMeetingConnected) {
      audioRef.current.disconnectMeetingAudio();
      setIsMeetingConnected(false);
      void speechRef.current?.stop();
      void speechRef.current?.start();
    } else {
      if (sttEngine === "google") {
        callbacksRef.current.onSwitchToWhisper?.();
      }
      const ok = await audioRef.current.captureMeetingAudio();
      setIsMeetingConnected(ok);
      if (ok) {
        const meetingStream = audioRef.current.getMeetingStream();
        if (meetingStream) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
            });
            void speechRef.current?.stop();
            void speechRef.current?.start(micStream, meetingStream);
          } catch {
            void speechRef.current?.stop();
            void speechRef.current?.start(undefined, meetingStream);
          }
        }
      } else {
        setSpeechError("Звук экрана не обнаружен. Выберите 'Весь экран' и включите галочку 'Поделиться аудио'");
      }
    }
  }, [audioRef, isMeetingConnected, sttEngine]);

  useEffect(() => {
    audioRef.current?.onMeetingAudioEnded(() => {
      setIsMeetingConnected(false);
      if (wasListeningRef.current) {
        void speechRef.current?.stop();
        void speechRef.current?.start();
      }
    });
  }, [audioRef]);

  const wasListeningRef = useRef(false);

  useEffect(() => {
    const wasListening = isListening || wasListeningRef.current;
    void speechRef.current?.stop();
    speechRef.current = createSpeechEngine(sttEngine, {
      onInterimPhrase: (text) => {
        setInterimPhrase(text);
        if (text.toLowerCase().trim() === "пас") {
          setInterimBadge({ text: "пас", type: "pass" });
        } else {
          setInterimBadge(null);
        }
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
