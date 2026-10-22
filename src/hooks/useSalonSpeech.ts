import { useState, useRef, useEffect, useCallback } from "react";
import type { SessionPhase } from "@/domain/types";
import { distillSpokenPhrase } from "@/domain/lexicon-engine";
import { distillWithNeuralFallback } from "@/domain/phrase-distiller";
import { defaultLexiconIndex } from "@/domain/lexicon-provider";
import { createSpeechEngine } from "@/speech/speech-factory";
import type { SpeechEnginePort, SpeechEngineKind } from "@/speech/speech-types";
import type { SalonAudioEngine } from "@/audio/audio-engine";
import type { InterimBadge } from "@/components/salon/VoiceIndicator";

interface UseSalonSpeechOptions {
  sttEngine: SpeechEngineKind;
  phase: SessionPhase;
  audioRef: React.MutableRefObject<SalonAudioEngine | null>;
  onPass: () => void;
  onAddFeeling: (text: string, family?: string, valence?: number) => void;
  onAddDesire: (text: string) => void;
}

export function useSalonSpeech({
  sttEngine,
  phase,
  audioRef,
  onPass,
  onAddFeeling,
  onAddDesire,
}: UseSalonSpeechOptions) {
  const isVoiceInit = typeof window !== "undefined" && window.location.search.includes("voice=1");
  const [isListening, setIsListening] = useState(isVoiceInit);
  const [isMeetingConnected, setIsMeetingConnected] = useState(false);
  const [lastPhrase, setLastPhrase] = useState("тишина у огня");
  const [interimPhrase, setInterimPhrase] = useState(isVoiceInit ? "я чувствую замедление" : "");
  const [interimBadge, setInterimBadge] = useState<InterimBadge | null>(
    isVoiceInit ? { text: "замедление", type: "feeling" } : null
  );
  const [speechError, setSpeechError] = useState<string | null>(null);
  const speechRef = useRef<SpeechEnginePort | null>(null);

  const handleSpeechResult = useCallback(
    async (phrase: string) => {
      // In-place morphing: keep phrase in UI with [нейрокоррекция] to prevent visual rollback (AP-054)
      setInterimPhrase(phrase);
      setInterimBadge({ text: "нейрокоррекция", type: "feeling" });

      const res = await distillWithNeuralFallback(phrase, defaultLexiconIndex);
      const settled = res.repairedText || phrase;

      setLastPhrase(settled);
      setInterimPhrase("");
      setInterimBadge(null);

      if (res.pass) return onPass();

      let matched = false;
      for (const f of res.feelings) {
        onAddFeeling(f.form || f.lemma, f.family, f.valence);
        matched = true;
      }
      for (const d of res.desires) {
        onAddDesire(d.text);
        matched = true;
      }
      if (!matched) {
        const clean = res.fallbackText || settled;
        if (res.isDesirePhrase || phase === "desires") {
          onAddDesire(clean);
        } else {
          // Authenticity (AP-013): keep user's authentic words without fake "спокойствие"
          onAddFeeling(clean, "живость", 0);
        }
      }
    },
    [phase, onPass, onAddFeeling, onAddDesire]
  );

  const handleToggleMeetingAudio = useCallback(async () => {
    if (!audioRef.current) return;
    if (isMeetingConnected) {
      audioRef.current.disconnectMeetingAudio();
      setIsMeetingConnected(false);
      speechRef.current?.stop();
      await speechRef.current?.start();
    } else {
      const ok = await audioRef.current.captureMeetingAudio();
      setIsMeetingConnected(ok);
      if (ok) {
        const stream = audioRef.current.getMeetingStream();
        if (stream) {
          speechRef.current?.stop();
          await speechRef.current?.start(stream);
        }
      }
    }
  }, [audioRef, isMeetingConnected]);

  useEffect(() => {
    speechRef.current?.stop();
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
        setIsListening(false);
      },
      onStatusChange: (active) => {
        setIsListening(active);
        if (active) setSpeechError(null);
      },
    });
  }, [sttEngine, handleSpeechResult]);

  return {
    isListening,
    isMeetingConnected,
    lastPhrase,
    interimPhrase,
    interimBadge,
    speechError,
    speechRef,
    handleSpeechResult,
    handleToggleMeetingAudio,
  };
}
