import type { SpeechEnginePort, SpeechEngineCallbacks, SpeechEngineKind } from "./speech-types";
import { SalonSpeechEngine } from "./speech-engine";
import { WhisperSpeechAdapter } from "./whisper-speech-adapter";

export function createSpeechEngine(
  kind: SpeechEngineKind,
  callbacks: SpeechEngineCallbacks = {},
  whisperUrl = "http://127.0.0.1:8085"
): SpeechEnginePort {
  if (kind === "whisper") {
    return new WhisperSpeechAdapter(callbacks, whisperUrl);
  }
  return new SalonSpeechEngine(callbacks);
}
