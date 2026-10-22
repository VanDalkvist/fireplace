import React, { useEffect, useRef, useState, useCallback } from "react";
import { createInitialState, setPhase, passTurn, addDesireToken } from "@/domain/session-fsm";
import type { SessionState, SessionPhase } from "@/domain/types";
import { DEMO_PHRASES } from "@/domain/demo-script";
import { distillSpokenPhrase } from "@/domain/lexicon-engine";
import { distillWithNeuralFallback, checkOllamaStatus } from "@/domain/phrase-distiller";
import { defaultLexiconIndex } from "@/domain/lexicon-provider";
import { createSpeechEngine } from "@/speech/speech-factory";
import type { SpeechEnginePort, SpeechEngineKind } from "@/speech/speech-types";
import { SalonAudioEngine } from "@/audio/audio-engine";
import { SalonMotionEngine } from "@/canvas/motion-engine";
import { useSalonHotkeys } from "@/hooks/useSalonHotkeys";
import { SalonHeader } from "./salon/SalonHeader";
import { SalonControls } from "./salon/SalonControls";
import { SalonPult } from "./salon/SalonPult";
import { VoiceIndicator, type InterimBadge } from "./salon/VoiceIndicator";
import { IntroDialog } from "./salon/IntroDialog";
import { HearthInput } from "./HearthInput";
import { cn } from "@/lib/utils";

export const SalonExperience: React.FC = () => {
  const [state, setState] = useState<SessionState>(() => createInitialState(12));
  const isVoiceInit = typeof window !== "undefined" && window.location.search.includes("voice=1");
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isListening, setIsListening] = useState(isVoiceInit);
  const [volume, setVolume] = useState(0.6);
  const [isPultOpen, setIsPultOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isZen, setIsZen] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [engineStatus, setEngineStatus] = useState({ online: false, hasModel: false });
  const [sttEngine, setSttEngine] = useState<SpeechEngineKind>(() =>
    typeof window !== "undefined" && window.location.search.includes("stt=google") ? "google" : "whisper"
  );
  const [isDemoActive, setIsDemoActive] = useState(() => typeof window !== "undefined" && window.location.search.includes("demo=1"));
  const [lastPhrase, setLastPhrase] = useState("тишина у огня");
  const [interimPhrase, setInterimPhrase] = useState(isVoiceInit ? "я чувствую замедление" : "");
  const [interimBadge, setInterimBadge] = useState<InterimBadge | null>(isVoiceInit ? { text: "замедление", type: "feeling" } : null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [demoIdx, setDemoIdx] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<SalonAudioEngine | null>(null);
  const motionRef = useRef<SalonMotionEngine | null>(null);
  const speechRef = useRef<SpeechEnginePort | null>(null);
  if (!audioRef.current) audioRef.current = new SalonAudioEngine();
  if (!motionRef.current) motionRef.current = new SalonMotionEngine();
  useEffect(() => { checkOllamaStatus().then(setEngineStatus); }, []);

  const handleAudioToggle = useCallback(() => setIsAudioOn(audioRef.current?.toggle() ?? false), []);

  const handleAddFeeling = useCallback((phrase: string, family: string, valence = 0, spkId?: number) => {
    setLastPhrase(phrase); setInterimPhrase("");
    const speakerId = spkId ?? state.activeSpeakerId ?? 1;
    audioRef.current?.playFeeling(family, valence);
    setState((prev) => ({
      ...prev, activeSpeakerId: speakerId,
      participants: prev.participants.map((p) => ({ ...p, isSpeaking: p.id === speakerId })),
      feelings: [...prev.feelings, {
        id: `feel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: phrase, lemma: phrase, family, valence, arousal: 0.5, intensity: 1.2, speakerId, timestamp: Date.now(),
      }],
    }));
  }, [state.activeSpeakerId]);

  const handleAddDesire = useCallback((desireText: string, spkId?: number) => {
    setLastPhrase(desireText); setInterimPhrase("");
    const speakerId = spkId ?? state.activeSpeakerId ?? 1;
    audioRef.current?.playDesire();
    setState((prev) => ({
      ...addDesireToken(prev, {
        id: `desire-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: desireText, object: desireText, who: "", speakerId, timestamp: Date.now(),
      }), activeSpeakerId: speakerId,
      participants: prev.participants.map((p) => ({ ...p, isSpeaking: p.id === speakerId })),
    }));
  }, [state.activeSpeakerId]);

  const handlePass = useCallback(() => {
    const speakerId = state.activeSpeakerId ?? 1;
    audioRef.current?.playPass();
    setLastPhrase("пас"); setInterimPhrase("");
    setState((prev) => passTurn(prev, speakerId));
  }, [state.activeSpeakerId]);

  const triggerNextTurn = useCallback(() => {
    const item = DEMO_PHRASES[demoIdx % DEMO_PHRASES.length];
    setDemoIdx((prev) => prev + 1);
    const currId = state.activeSpeakerId ?? 1;
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((id) => id !== currId);
    const nextId = candidates[Math.floor(Math.random() * candidates.length)];

    if (item.isPass) handlePass();
    else if (item.desire) handleAddDesire(item.desire, nextId);
    else if (item.family) handleAddFeeling(item.text, item.family, item.valence ?? 0, nextId);
  }, [demoIdx, state.activeSpeakerId, handlePass, handleAddDesire, handleAddFeeling]);

  const handleSpeechResult = useCallback(async (phrase: string) => {
    setInterimPhrase(""); setInterimBadge(null);
    const res = await distillWithNeuralFallback(phrase, defaultLexiconIndex);
    if (res.repairedText) setLastPhrase(res.repairedText);
    if (res.pass) return handlePass();
    let matched = false;
    for (const f of res.feelings) { handleAddFeeling(f.form || f.lemma, f.family, f.valence); matched = true; }
    for (const d of res.desires) { handleAddDesire(d.text); matched = true; }
    if (!matched) {
      const clean = res.fallbackText || res.repairedText || phrase;
      if (res.isDesirePhrase || state.phase === "desires") handleAddDesire(clean);
      else handleAddFeeling(clean, "спокойствие", 0);
    }
  }, [state.phase, handlePass, handleAddFeeling, handleAddDesire]);

  const handleAdvanceTurn = useCallback(() => {
    speechRef.current?.flush();
    setState((prev) => {
      const nextId = ((prev.activeSpeakerId ?? 1) % 12) + 1;
      return {
        ...prev, activeSpeakerId: nextId,
        participants: prev.participants.map((p) => ({ ...p, isSpeaking: p.id === nextId })),
      };
    });
  }, []);

  useEffect(() => {
    speechRef.current?.stop();
    speechRef.current = createSpeechEngine(sttEngine, {
      onInterimPhrase: (text) => {
        setInterimPhrase(text);
        const p = distillSpokenPhrase(text, defaultLexiconIndex);
        if (p.pass) setInterimBadge({ text: "пас", type: "pass" });
        else if (p.feelings.length > 0) setInterimBadge({ text: p.feelings[0].form || p.feelings[0].lemma, type: "feeling" });
        else if (p.desires.length > 0) setInterimBadge({ text: p.desires[0].text, type: "desire" });
        else setInterimBadge(null);
      },
      onFinalPhrase: handleSpeechResult,
      onError: (err) => { setSpeechError(err); setIsListening(false); },
      onStatusChange: (active) => { setIsListening(active); if (active) setSpeechError(null); },
    });
  }, [sttEngine, handleSpeechResult]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !motionRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const seatId = motionRef.current.getSeatAtPoint((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr);
    if (seatId !== null) {
      speechRef.current?.flush();
      setState((prev) => ({
        ...prev, activeSpeakerId: seatId,
        participants: prev.participants.map((p) => ({ ...p, isSpeaking: p.id === seatId })),
      }));
    }
  }, []);

  useSalonHotkeys({
    onTogglePult: () => setIsPultOpen((p) => !p), onToggleHelp: () => setIsIntroOpen((p) => !p),
    onToggleZen: () => setIsZen((p) => !p),
    onToggleFullscreen: () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen?.();
    },
    onTriggerTurn: triggerNextTurn, onPass: handlePass, onToggleAudio: handleAudioToggle,
    onToggleSpeech: () => speechRef.current?.toggle(), onToggleInput: () => setIsInputOpen((p) => !p),
    onAdvanceTurn: handleAdvanceTurn, onSelectPhase: (phase) => setState((prev) => setPhase(prev, phase)),
  });

  useEffect(() => {
    if (!isDemoActive) return;
    const timer = setInterval(triggerNextTurn, 5500);
    return () => clearInterval(timer);
  }, [isDemoActive, triggerNextTurn]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const render = (time: number) => {
      const w = (canvas.width = Math.round(window.innerWidth * dpr)), h = (canvas.height = Math.round(window.innerHeight * dpr));
      motionRef.current?.syncTokens(state.feelings, state.desires, state.participants, state.activeSpeakerId, w, h, ctx);
      motionRef.current?.render(ctx, w, h, state.activeSpeakerId, time);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [state.feelings, state.desires, state.participants, state.activeSpeakerId]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background text-foreground select-none">
      <canvas ref={canvasRef} onClick={handleCanvasClick} className="fixed inset-0 z-0 block w-full h-full cursor-default" />

      {/* Floating Header */}
      <div className={cn("fixed top-3 left-4 right-4 z-10 transition-all duration-300", isZen && "-translate-y-4 opacity-0 pointer-events-none")}>
        <SalonHeader
          phase={state.phase} isListening={isListening} isZen={isZen}
          onPhaseSelect={(p: SessionPhase) => setState((prev) => setPhase(prev, p))}
          onToggleZen={() => setIsZen((prev) => !prev)}
          onOpenPult={() => setIsPultOpen(true)} onOpenHelp={() => setIsIntroOpen(true)}
        />
      </div>

      {/* Floating Bottom HUD */}
      <div className={cn("fixed bottom-3 left-4 right-4 z-10 flex flex-col items-center gap-2 transition-all duration-300", isZen && "translate-y-4 opacity-0 pointer-events-none")}>
        <VoiceIndicator
          isListening={isListening} activeSpeakerNumber={state.activeSpeakerId}
          lastPhraseText={lastPhrase} interimText={interimPhrase} interimBadge={interimBadge}
          errorMessage={speechError} engineType={sttEngine}
          onToggleListening={() => speechRef.current?.toggle()} isSupported={speechRef.current?.isSupported()}
        />
        <div className="w-full max-w-[1100px]">
          <SalonControls
            phase={state.phase} isAudioOn={isAudioOn} isListening={isListening} isDemoActive={isDemoActive}
            engineStatus={engineStatus} sttEngine={sttEngine}
            onToggleSttEngine={() => setSttEngine((prev) => (prev === "whisper" ? "google" : "whisper"))}
            onInputToggle={() => setIsInputOpen((prev) => !prev)}
            onPhaseSelect={(p: SessionPhase) => setState((prev) => setPhase(prev, p))}
            onAudioToggle={handleAudioToggle} onSpeechToggle={() => speechRef.current?.toggle()}
            onTriggerTurn={triggerNextTurn}
            onToggleDemo={() => setIsDemoActive((prev) => !prev)}
            onAddPhrase={(text, family, kind) => {
              if (kind === "pass") handlePass(); else if (kind === "desire") handleAddDesire(text); else handleAddFeeling(text, family || "спокойствие");
            }}
          />
        </div>
      </div>

      <HearthInput
        isOpen={isInputOpen} activeSpeakerId={state.activeSpeakerId ?? 1} engineStatus={engineStatus}
        onClose={() => setIsInputOpen(false)} onSubmit={handleSpeechResult}
      />

      <SalonPult
        open={isPultOpen} onOpenChange={setIsPultOpen} volume={volume}
        onVolumeChange={(v) => { setVolume(v); audioRef.current?.setVolume(v); }}
        phase={state.phase} onPhaseChange={(p) => setState((prev) => setPhase(prev, p))}
        onNextSpeaker={handleAdvanceTurn} onPass={handlePass} onTriggerDemoPhrase={triggerNextTurn}
        onToggleDemoMode={() => setIsDemoActive((prev) => !prev)} isDemoActive={isDemoActive}
        isListening={isListening} onToggleListening={() => speechRef.current?.toggle()}
        isSpeechSupported={speechRef.current?.isSupported()}
      />
      <IntroDialog open={isIntroOpen} onOpenChange={setIsIntroOpen} onEnterCircle={() => { setIsIntroOpen(false); if (!isAudioOn) handleAudioToggle(); }} />
    </div>
  );
};
