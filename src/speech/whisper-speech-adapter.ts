import type { SpeechEnginePort, SpeechEngineCallbacks, SpeechEngineKind, SpeechToTextPort } from "./speech-types";
import { StreamRecorder } from "./stream-recorder";
import { OpenAiSpeechAdapter } from "./openai-speech-adapter";
import { SherpaSpeakerAdapter } from "@/speaker/sherpa-speaker-adapter";
import type { SpeakerIdentificationPort } from "@/speaker/speaker-types";
import { clientLogger } from "@/infrastructure/client-logger";

export class WhisperSpeechAdapter implements SpeechEnginePort {
  private recorder: StreamRecorder;
  private callbacks: SpeechEngineCallbacks;
  private isListeningActive = false;
  private asrPort: SpeechToTextPort;
  private speakerPort: SpeakerIdentificationPort;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;

  constructor(
    callbacks: SpeechEngineCallbacks = {},
    asrPortOrUrl: SpeechToTextPort | string = "http://127.0.0.1:8085",
    speakerPort?: SpeakerIdentificationPort
  ) {
    this.callbacks = callbacks;
    if (typeof asrPortOrUrl === "string") {
      this.asrPort = new OpenAiSpeechAdapter({
        id: "whisper",
        name: "Whisper Large Turbo",
        baseUrl: asrPortOrUrl,
      });
    } else {
      this.asrPort = asrPortOrUrl;
    }
    this.speakerPort = speakerPort || new SherpaSpeakerAdapter();
    this.recorder = new StreamRecorder();
  }

  public isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined"
    );
  }

  public getEngineType(): SpeechEngineKind {
    return (this.asrPort.id as SpeechEngineKind) || "whisper";
  }

  public async start(stream?: MediaStream): Promise<void> {
    if (this.isListeningActive) return;
    try {
      await this.recorder.start(stream, 250);
      this.isListeningActive = true;
      this.callbacks.onStatusChange?.(true);

      this.armSilenceTimer();
    } catch (err) {
      this.isListeningActive = false;
      this.callbacks.onStatusChange?.(false);
      this.callbacks.onError?.(
        err instanceof Error ? err.message : "Не удалось запустить запись для Whisper"
      );
    }
  }

  private armSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      void this.processCurrentSegment();
      if (this.isListeningActive) {
        this.armSilenceTimer();
      }
    }, 4500);
  }

  private async processCurrentSegment(isExplicitFlush = false): Promise<void> {
    if (!this.isListeningActive) return;

    // VAD Gate: if no speech was detected in this segment, keep listening without calling Whisper (AP-012)
    const hasSpeech = this.recorder.hasSpeechInCurrentSegment?.() ?? true;
    if (!hasSpeech && !isExplicitFlush) {
      clientLogger.info(`[${this.asrPort.name}] segment skipped: quiet/silence (ringBuffer: ${this.recorder.getRingBufferSize?.() ?? 0})`);
      return;
    }

    const blob = await this.recorder.extractCurrentSegment();
    if (!blob || blob.size === 0) return;

    clientLogger.info(`[${this.asrPort.name}] processing segment: ${blob.size} bytes (${blob.type})`);
    this.callbacks.onInterimPhrase?.(`распознавание ${this.asrPort.name}...`);
    try {
      const [text, speakerResult] = await Promise.all([
        this.asrPort.transcribe(blob),
        this.speakerPort.identify(blob),
      ]);

      this.consecutiveErrors = 0;

      if (text && text.trim().length > 0) {
        clientLogger.info(`[${this.asrPort.name}] Final phrase recognized: "${text.trim()}" (seat: ${speakerResult?.seatNumber ?? "none"})`);
        this.callbacks.onFinalPhrase?.(text, speakerResult?.seatNumber);
      } else {
        clientLogger.info(`[${this.asrPort.name}] Clean audio had no verbal words`);
      }
    } catch (err) {
      this.consecutiveErrors++;
      clientLogger.error(`${this.asrPort.name} segment error (${this.consecutiveErrors}/3)`, err);
      this.callbacks.onError?.(
        `Ошибка ${this.asrPort.name}: ${err instanceof Error ? err.message : String(err)}`
      );

      // Only terminate listening after 3 consecutive failures (resilient recovery AP-012)
      if (this.consecutiveErrors >= 3) {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.isListeningActive = false;
        this.callbacks.onStatusChange?.(false);
      }
    }
  }

  public async stop(): Promise<void> {
    if (!this.isListeningActive) return;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);

    this.isListeningActive = false;
    this.callbacks.onStatusChange?.(false);

    try {
      const blob = await this.recorder.stop();
      if (blob.size > 200) {
        this.callbacks.onInterimPhrase?.(`распознавание ${this.asrPort.name}...`);
        const [text, speakerResult] = await Promise.all([
          this.asrPort.transcribe(blob),
          this.speakerPort.identify(blob),
        ]);
        if (text && text.trim().length > 0) {
          this.callbacks.onFinalPhrase?.(text, speakerResult?.seatNumber);
        }
      }
    } catch (err) {
      this.callbacks.onError?.(
        `Ошибка ${this.asrPort.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      this.recorder.cleanup();
    }
  }

  public toggle(): void {
    if (this.isListeningActive) {
      this.stop();
    } else {
      this.start();
    }
  }

  public flush(): void {
    if (!this.isListeningActive) return;
    void this.processCurrentSegment(true);
    this.armSilenceTimer();
  }
}
