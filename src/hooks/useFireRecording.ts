import { useState, type MutableRefObject } from "react";
import type { SalonAudioEngine } from "@/audio/audio-engine";
import { DEFAULT_FIRE_RECORDING_ID, FIRE_RECORDINGS, requireFireRecording } from "@/config/fire-recordings";

const key = "salon_fire_recording";
function initialRecording(): string {
  if (typeof window === "undefined") return DEFAULT_FIRE_RECORDING_ID;
  try {
    const saved = localStorage.getItem(key);
    if (saved && FIRE_RECORDINGS.some(item => item.id === saved)) return saved;
    if (saved) console.warn("[FireRecording] Unknown saved choice; using configured default");
  } catch (error) {
    console.warn("[FireRecording] Cannot read saved choice:", error instanceof Error ? error.name : "unknown");
  }
  return DEFAULT_FIRE_RECORDING_ID;
}

export function useFireRecording(audio: MutableRefObject<SalonAudioEngine | null>) {
  const [recordingId, setRecordingId] = useState(initialRecording);
  const recording = requireFireRecording(recordingId);
  const index = FIRE_RECORDINGS.findIndex(item => item.id === recordingId);
  const cycleRecording = () => {
    const next = FIRE_RECORDINGS[(index + 1) % FIRE_RECORDINGS.length];
    audio.current?.selectRecording(next.id);
    setRecordingId(next.id);
    try { localStorage.setItem(key, next.id); }
    catch (error) { console.warn("[FireRecording] Cannot save choice:", error instanceof Error ? error.name : "unknown"); }
  };
  return { recordingId, recordingLabel: recording.label, recordingPosition: `${index + 1}/${FIRE_RECORDINGS.length}`, cycleRecording };
}
