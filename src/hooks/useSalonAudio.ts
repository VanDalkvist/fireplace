import { useCallback, useEffect, useState, type MutableRefObject } from "react";
import type { SalonAudioEngine } from "@/audio/audio-engine";
import { createSalonAudioEngine } from "@/composition/audio";
import { readAudioEnabled, writeAudioEnabled } from "@/infrastructure/audio-preference";

/** Restores sound intent only, never microphone or meeting capture. No sample on reload. */
export function useSalonAudio(audioRef: MutableRefObject<SalonAudioEngine | null>, recordingId: string) {
  const [isAudioOn, setIsAudioOn] = useState(() => readAudioEnabled());
  const [audioError, setAudioError] = useState<string | null>(null);
  const failed = useCallback(() => {
    setIsAudioOn(false);
    setAudioError("Звук костра недоступен. Включи звук ещё раз, чтобы повторить загрузку.");
  }, []);

  if (!audioRef.current && typeof window !== "undefined") {
    audioRef.current = createSalonAudioEngine(failed, recordingId);
  }

  useEffect(() => {
    const engine = audioRef.current;
    try {
      if (engine && engine.active !== isAudioOn && engine.toggle() !== isAudioOn) failed();
    } catch { failed(); }
    writeAudioEnabled(isAudioOn);
  }, [audioRef, isAudioOn, failed]);

  useEffect(() => {
    const resume = () => audioRef.current?.resumeIfEnabled();
    window.addEventListener("pointerdown", resume, true);
    window.addEventListener("keydown", resume, true);
    return () => {
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("keydown", resume, true);
    };
  }, [audioRef]);

  const handleAudioToggle = useCallback(() => {
    const engine = audioRef.current;
    if (!engine) return;
    setAudioError(null);
    try { setIsAudioOn(engine.toggle()); } catch { failed(); }
  }, [audioRef, failed]);

  return { isAudioOn, audioError, handleAudioToggle };
}
