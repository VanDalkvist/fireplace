import type { SpeakerIdentificationPort } from "./speaker-types";
import { SherpaSpeakerAdapter } from "./sherpa-speaker-adapter";

export function createSpeakerIdentifier(serviceUrl = "http://127.0.0.1:8086"): SpeakerIdentificationPort {
  return new SherpaSpeakerAdapter({ serviceUrl });
}
