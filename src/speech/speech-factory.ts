import type { SpeechEnginePort, SpeechEngineCallbacks, SpeechEngineKind } from "./speech-types";
import { SalonSpeechEngine } from "./speech-engine";
import { WhisperSpeechAdapter } from "./whisper-speech-adapter";
import type { SpeakerIdentificationPort } from "@/speaker/speaker-types";

export function createSpeechEngine(
  kind: SpeechEngineKind,
  callbacks: SpeechEngineCallbacks = {},
  whisperUrl = "http://127.0.0.1:8085",
  speakerPort?: SpeakerIdentificationPort
): SpeechEnginePort {
  if (kind === "whisper") {
    return new WhisperSpeechAdapter(callbacks, whisperUrl, speakerPort);
  }
  return new SalonSpeechEngine(callbacks);
}
