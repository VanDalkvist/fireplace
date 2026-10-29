import type { SpeechToTextPort } from "./speech-types";
import { clientLogger } from "@/infrastructure/client-logger";

/**
 * Composite Fallback Adapter implementing SpeechToTextPort.
 * Decorates a primary provider with an automatic secondary fallback provider
 * upon transcription failure (e.g. HTTP 422/500 or network timeout).
 * Compliance: AP-019 (<= 250 lines), AP-029 (strict TS)
 */
export class FallbackSpeechAdapter implements SpeechToTextPort {
  constructor(
    private primary: SpeechToTextPort,
    private fallback: SpeechToTextPort
  ) {}

  public get id(): string {
    return this.primary.id;
  }

  public get name(): string {
    return this.primary.name;
  }

  public get isLocal(): boolean {
    return this.primary.isLocal;
  }

  public get baseUrl(): string | undefined {
    return this.primary.baseUrl;
  }

  public async transcribe(audioBlob: Blob): Promise<string> {
    try {
      return await this.primary.transcribe(audioBlob);
    } catch (primaryErr) {
      clientLogger.warn({
        event: "asr_fallback_triggered",
        primaryProvider: this.primary.id || this.primary.name,
        fallbackProvider: this.fallback.id || this.fallback.name,
        errorType: primaryErr instanceof Error ? primaryErr.name : "unknown",
      });
      try {
        return await this.fallback.transcribe(audioBlob);
      } catch (fallbackErr) {
        clientLogger.error({
          event: "asr_fallback_exhausted",
          fallbackProvider: this.fallback.id || this.fallback.name,
          errorType: fallbackErr instanceof Error ? fallbackErr.name : "unknown",
        });
        throw primaryErr;
      }
    }
  }
}
