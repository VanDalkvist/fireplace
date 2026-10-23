import { SalonAudioEngine } from "@/audio/audio-engine";
import { NaturalFireAdapter } from "@/audio/natural-fire-adapter";
import { loadAudioSample } from "@/audio/load-audio-sample";
import { DEFAULT_FIRE_RECORDING_ID, requireFireRecording } from "@/config/fire-recordings";

export function createSalonAudioEngine(onError?: (error: unknown) => void, recordingId = DEFAULT_FIRE_RECORDING_ID): SalonAudioEngine {
  requireFireRecording(recordingId);
  const effects = new NaturalFireAdapter((context, id) => {
    if (!id) throw new Error("Fire recording must be configured");
    return loadAudioSample(context, requireFireRecording(id).url);
  });
  effects.selectRecording(recordingId);
  return new SalonAudioEngine(effects, onError);
}
