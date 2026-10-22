import { useState, useRef, useEffect, useCallback } from "react";
import type { SessionPhase } from "@/domain/types";
import { distillSpokenPhrase } from "@/domain/lexicon-engine";
import { distillWithNeuralFallback } from "@/domain/phrase-distiller";
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
  const callbacksRef = useRef({
    phase,
    onPass,
    onAddFeeling,
    onAddDesire,
    onSelectSpeaker,
    onSwitchToWhisper,
  });
  callbacksRef.current = {
    phase,
    onPass,
    onAddFeeling,
    onAddDesire,
    onSelectSpeaker,
    onSwitchToWhisper,
  };

  const handleSpeechResult = useCallback(async (phrase: string, speakerSeat?: number) => {
    // Zero-click acoustic turn taking (AP-054)
    if (speakerSeat) {
      setIdentifiedSpeaker({ seatNumber: speakerSeat, speakerId: `seat_${speakerSeat}` });
      callbacksRef.current.onSelectSpeaker?.(speakerSeat);
    }

    // In-place morphing: keep phrase in UI with [нейрокоррекция] to prevent visual rollback (AP-054)
    setInterimPhrase(phrase);
    setInterimBadge({ text: "нейрокоррекция", type: "feeling" });

    const res = await distillWithNeuralFallback(phrase, defaultLexiconIndex);
    const settled = res.repairedText || phrase;

    setLastPhrase(settled);
    setInterimPhrase("");
    setInterimBadge(null);

    const { phase: currentPhase, onPass: passFn, onAddFeeling: feelFn, onAddDesire: desireFn } =
      callbacksRef.current;

    if (res.pass) return passFn();

    let matched = false;
    for (const f of res.feelings) {
      feelFn(f.form || f.lemma, f.family, f.valence, speakerSeat);
      matched = true;
    }
    for (const d of res.desires) {
      desireFn(d.text, speakerSeat);
      matched = true;
    }
    if (!matched) {
      const clean = res.fallbackText || settled;
      if (res.isDesirePhrase || currentPhase === "desires") {
        desireFn(clean, speakerSeat);
      } else {
        // Authenticity (AP-013): keep user's authentic words without fake "спокойствие"
        feelFn(clean, "живость", 0, speakerSeat);
      }
    }
  }, []);

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
        const p = distillSpokenPhrase(text, defaultLexiconIndex);
        if (p.pass) {
          setInterimBadge({ text: "пас", type: "pass" });
        } else if (p.feelings.length > 0) {
          setInterimBadge({ text: p.feelings[0].form || p.feelings[0].lemma, type: "feeling" });
        } else if (p.desires.length > 0) {
          setInterimBadge({ text: p.desires[0].text, type: "desire" });
        } else {
          setInterimBadge(null);
        }
      },
      onFinalPhrase: handleSpeechResult,
      onError: (err) => {
        setSpeechError(err);
      },
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
