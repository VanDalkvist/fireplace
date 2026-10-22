import type { SpeechEnginePort, SpeechEngineCallbacks, SpeechEngineKind } from "./speech-types";
import { SalonSpeechEngine } from "./speech-engine";
import { WhisperSpeechAdapter } from "./whisper-speech-adapter";
import { OpenAiSpeechAdapter } from "./openai-speech-adapter";
import { FallbackSpeechAdapter } from "./fallback-speech-adapter";
import { SpeechServiceRegistry } from "./speech-registry";
import type { SpeakerIdentificationPort } from "@/speaker/speaker-types";

export function createDefaultSpeechRegistry(
  gigaAmUrl = "http://127.0.0.1:9876",
  whisperUrl = "http://127.0.0.1:8085"
): SpeechServiceRegistry {
  const registry = new SpeechServiceRegistry();
  const whisperAdapter = new OpenAiSpeechAdapter({
    id: "whisper",
    name: "Whisper Large Turbo",
    baseUrl: whisperUrl,
    model: "whisper-large-v3-turbo",
  });
  const gigaAmAdapter = new OpenAiSpeechAdapter({
    id: "gigaam",
    name: "Sber GigaAM v3",
    baseUrl: gigaAmUrl,
    model: "gigaam-v3",
  });

  // GigaAM is wrapped with Whisper fallback via Composite/Decorator pattern!
  const resilientGigaAm = new FallbackSpeechAdapter(gigaAmAdapter, whisperAdapter);

  registry.register(resilientGigaAm);
  registry.register(whisperAdapter);
  return registry;
}

export function createSpeechEngine(
  kind: SpeechEngineKind,
  callbacks: SpeechEngineCallbacks = {},
  baseUrl?: string,
  speakerPort?: SpeakerIdentificationPort,
  registry?: SpeechServiceRegistry
): SpeechEnginePort {
  if (kind === "google") {
    return new SalonSpeechEngine(callbacks);
  }

  const reg = registry || createDefaultSpeechRegistry();
  const asrPort = reg.get(kind) || reg.getActive();

  if (baseUrl && asrPort instanceof OpenAiSpeechAdapter) {
    const customAsr = new OpenAiSpeechAdapter({
      id: asrPort.id,
      name: asrPort.name,
      baseUrl,
    });
    return new WhisperSpeechAdapter(callbacks, customAsr, speakerPort);
  }

  return new WhisperSpeechAdapter(callbacks, asrPort, speakerPort);
}
