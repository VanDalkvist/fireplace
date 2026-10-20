import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  createInitialState,
  setPhase,
  nextSpeaker,
  passTurn,
  addDesireToken,
} from "@/domain/session-fsm";
import type { SessionState, SessionPhase, FeelingToken, DesireToken } from "@/domain/types";
import { computeSelectiveEdges } from "@/domain/linking-graph";
import { DEMO_PHRASES } from "@/domain/demo-script";
import { SalonAudioEngine } from "@/audio/audio-engine";
import { SalonMotionEngine } from "@/canvas/motion-engine";
import { SalonHeader } from "./salon/SalonHeader";
import { SeatCircle } from "./salon/SeatCircle";
import { SalonPult } from "./salon/SalonPult";
import { VoiceIndicator } from "./salon/VoiceIndicator";
import { IntroDialog } from "./salon/IntroDialog";

export const SalonExperience: React.FC = () => {
  const [state, setState] = useState<SessionState>(() => createInitialState(12));
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [isPultOpen, setIsPultOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isDemoActive, setIsDemoActive] = useState(() =>
    typeof window !== "undefined" && window.location.search.includes("demo=1")
  );
  const [lastPhrase, setLastPhrase] = useState<string>("тишина в начале круга");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<SalonAudioEngine | null>(null);
  const motionRef = useRef<SalonMotionEngine | null>(null);

  if (!audioRef.current) audioRef.current = new SalonAudioEngine();
  if (!motionRef.current) motionRef.current = new SalonMotionEngine();

  const handleAudioToggle = useCallback(() => {
    const active = audioRef.current?.toggle() ?? false;
    setIsAudioOn(active);
  }, []);

  const handleAddFeeling = useCallback((phrase: string, family: string, valence: number = 0) => {
    setLastPhrase(phrase);
    const speakerId = state.activeSpeakerId ?? 1;
    const newToken: FeelingToken = {
      id: `feel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: phrase,
      lemma: phrase,
      family,
      valence,
      arousal: 0.5,
      intensity: 1.2,
      speakerId,
      timestamp: Date.now(),
    };
    audioRef.current?.playFeeling(family, valence);
    setState((prev) => ({
      ...prev,
      feelings: [...prev.feelings, newToken],
      connections: computeSelectiveEdges(prev.feelings, [newToken], prev.connections),
    }));
  }, [state.activeSpeakerId]);

  const handleAddDesire = useCallback((desireText: string) => {
    setLastPhrase(`✦ ${desireText}`);
    const speakerId = state.activeSpeakerId ?? 1;
    const newToken: DesireToken = {
      id: `desire-${Date.now()}`,
      text: desireText,
      object: desireText,
      who: "",
      speakerId,
      timestamp: Date.now(),
    };
    audioRef.current?.playDesire();
    setState((prev) => addDesireToken(prev, newToken));
  }, [state.activeSpeakerId]);

  const handleNextSpeaker = useCallback(() => {
    setState((prev) => nextSpeaker(prev));
  }, []);

  const handlePass = useCallback(() => {
    const speakerId = state.activeSpeakerId;
    if (speakerId !== null && speakerId !== undefined) {
      audioRef.current?.playPass();
      setLastPhrase("пас");
      setState((prev) => passTurn(prev, speakerId));
    }
  }, [state.activeSpeakerId]);

  const triggerNextTurn = useCallback(() => {
    const item = DEMO_PHRASES[Math.floor(Math.random() * DEMO_PHRASES.length)];
    if (item.desire) {
      handleAddDesire(item.desire);
    } else if (item.family) {
      handleAddFeeling(item.text, item.family, item.valence);
    }
    handleNextSpeaker();
  }, [handleAddDesire, handleAddFeeling, handleNextSpeaker]);

  // Demo automated loop
  useEffect(() => {
    if (!isDemoActive) return;
    const timer = setInterval(() => triggerNextTurn(), 4000);
    return () => clearInterval(timer);
  }, [isDemoActive, triggerNextTurn]);

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Tab") {
        e.preventDefault();
        setIsPultOpen((prev) => !prev);
      } else if (e.key === "h" || e.key === "р" || e.key === "?") {
        setIsIntroOpen((prev) => !prev);
      } else if (e.key === " ") {
        e.preventDefault();
        handleNextSpeaker();
      } else if (e.key === "p" || e.key === "з") {
        handlePass();
      } else if (e.key === "m" || e.key === "ь") {
        handleAudioToggle();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const phases: SessionPhase[] = ["silence", "feelings", "desires", "completion"];
        setState((prev) => setPhase(prev, phases[parseInt(e.key, 10) - 1]));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextSpeaker, handlePass, handleAudioToggle]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const render = (time: number) => {
      const w = (canvas.width = window.innerWidth);
      const h = (canvas.height = window.innerHeight);
      motionRef.current?.syncTokens(state.feelings, state.desires, state.participants, w, h);
      motionRef.current?.render(ctx, w, h, state.connections, time);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [state.feelings, state.desires, state.connections, state.participants]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background text-foreground select-none">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 block w-full h-full" />
      <div className="relative z-10 w-full h-full pointer-events-none flex flex-col justify-between">
        <div className="pointer-events-auto">
          <SalonHeader
            phase={state.phase}
            isAudioOn={isAudioOn}
            isListening={state.isListening}
            onPhaseSelect={(p) => setState((prev) => setPhase(prev, p))}
            onAudioToggle={handleAudioToggle}
            onOpenPult={() => setIsPultOpen(true)}
            onOpenHelp={() => setIsIntroOpen(true)}
          />
        </div>
        <div className="flex flex-col items-center gap-4 mb-4">
          <VoiceIndicator
            isListening={state.isListening}
            activeSpeakerNumber={state.activeSpeakerId}
            lastPhraseText={lastPhrase}
          />
          <div className="pointer-events-auto">
            <SeatCircle
              participants={state.participants}
              activeSpeakerId={state.activeSpeakerId}
              onSelectSpeaker={(id) =>
                setState((prev) => ({
                  ...prev,
                  activeSpeakerId: id,
                  participants: prev.participants.map((p) => ({ ...p, isSpeaking: p.id === id })),
                }))
              }
            />
          </div>
        </div>
        <SalonPult
          open={isPultOpen}
          onOpenChange={setIsPultOpen}
          volume={volume}
          onVolumeChange={(v) => {
            setVolume(v);
            audioRef.current?.setVolume(v);
          }}
          phase={state.phase}
          onPhaseChange={(p) => setState((prev) => setPhase(prev, p))}
          onNextSpeaker={handleNextSpeaker}
          onPass={handlePass}
          onTriggerDemoPhrase={triggerNextTurn}
          onToggleDemoMode={() => setIsDemoActive((prev) => !prev)}
          isDemoActive={isDemoActive}
        />
        <IntroDialog
          open={isIntroOpen}
          onOpenChange={setIsIntroOpen}
          onEnterCircle={() => {
            setIsIntroOpen(false);
            if (!isAudioOn) handleAudioToggle();
          }}
        />
      </div>
    </div>
  );
};
