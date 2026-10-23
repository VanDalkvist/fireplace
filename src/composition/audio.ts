import { SalonAudioEngine } from "@/audio/audio-engine";
import { NaturalFireAdapter } from "@/audio/natural-fire-adapter";
import { loadAudioSample } from "@/audio/load-audio-sample";

const recording = new URL("../assets/audio/fire-crackling.wav", import.meta.url).href;

export function createSalonAudioEngine(onError?: (error: unknown) => void): SalonAudioEngine {
  const effects = new NaturalFireAdapter(context => loadAudioSample(context, recording));
  return new SalonAudioEngine(effects, onError);
}
