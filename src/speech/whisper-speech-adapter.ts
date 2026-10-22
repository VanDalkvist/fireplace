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
  private maxDurationTimer: ReturnType<typeof setTimeout> | null = null;
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
      if (typeof this.recorder.setVadCallbacks === "function") {
        this.recorder.setVadCallbacks({
          onAudioLevel: (rms) => this.callbacks.onAudioLevel?.(rms),
          onSpeechStart: () => {
            this.callbacks.onPipelineStatus?.("hearing");
            this.armMaxDurationTimer();
          },
          onSpeechEnd: () => {
            this.clearMaxDurationTimer();
            this.callbacks.onPipelineStatus?.("transcribing");
            void this.processCurrentSegment(false, 0);
          },
        });
      }

      await this.recorder.start(stream, 250);
      this.isListeningActive = true;
      this.callbacks.onStatusChange?.(true);
      this.callbacks.onPipelineStatus?.("idle");
    } catch (err) {
      this.isListeningActive = false;
      this.callbacks.onStatusChange?.(false);
      this.callbacks.onPipelineStatus?.("error");
      this.callbacks.onError?.(
        err instanceof Error ? err.message : "Не удалось запустить запись"
      );
    }
  }

  private armMaxDurationTimer(): void {
    this.clearMaxDurationTimer();
    // Safety ceiling for continuous monologue: 7.0s with 1.5s left-context (FluidAudio pattern)
    this.maxDurationTimer = setTimeout(() => {
      if (this.isListeningActive) {
        void this.processCurrentSegment(false, 1500);
        this.armMaxDurationTimer();
      }
    }, 7000);
  }

  private clearMaxDurationTimer(): void {
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }
  }

  private async processCurrentSegment(isExplicitFlush = false, leftContextMs = 0): Promise<void> {
    if (!this.isListeningActive) return;

    const hasSpeech = this.recorder.hasSpeechInCurrentSegment?.() ?? true;
    if (!hasSpeech && !isExplicitFlush) {
      clientLogger.info(`[${this.asrPort.name}] segment skipped: quiet/silence (ringBuffer: ${this.recorder.getRingBufferSize?.() ?? 0})`);
      return;
    }

    const blob = leftContextMs > 0 && typeof this.recorder.extractSegmentWithContext === "function"
      ? await this.recorder.extractSegmentWithContext(leftContextMs)
      : await this.recorder.extractCurrentSegment();

    if (!blob || blob.size === 0) return;

    clientLogger.info(`[${this.asrPort.name}] processing segment: ${blob.size} bytes (${blob.type})`);
    this.callbacks.onPipelineStatus?.("transcribing");
    this.callbacks.onInterimPhrase?.(`распознавание ${this.asrPort.name}...`);

    try {
      const [text, speakerResult] = await Promise.all([
        this.asrPort.transcribe(blob),
        this.speakerPort.identify(blob),
      ]);

      this.consecutiveErrors = 0;

      if (text && text.trim().length > 0) {
        clientLogger.info(`[${this.asrPort.name}] Final phrase recognized: "${text.trim()}" (seat: ${speakerResult?.seatNumber ?? "none"})`);
        this.callbacks.onPipelineStatus?.("distilling");
        this.callbacks.onFinalPhrase?.(text, speakerResult?.seatNumber);
      } else {
        clientLogger.info(`[${this.asrPort.name}] Clean audio had no verbal words`);
      }
    } catch (err) {
      this.consecutiveErrors++;
      clientLogger.error(`${this.asrPort.name} segment error (${this.consecutiveErrors}/3)`, err);
      this.callbacks.onPipelineStatus?.("error");
      this.callbacks.onError?.(
        `Ошибка ${this.asrPort.name}: ${err instanceof Error ? err.message : String(err)}`
      );

      // Only terminate listening after 3 consecutive failures (AP-012)
      if (this.consecutiveErrors >= 3) {
        this.clearMaxDurationTimer();
        this.isListeningActive = false;
        this.callbacks.onStatusChange?.(false);
      }
    } finally {
      if (this.isListeningActive) {
        this.callbacks.onPipelineStatus?.("idle");
      }
    }
  }

  public async stop(): Promise<void> {
    if (!this.isListeningActive) return;
    this.clearMaxDurationTimer();
    this.isListeningActive = false;
    this.callbacks.onStatusChange?.(false);
    this.callbacks.onPipelineStatus?.("idle");

    try {
      const blob = await this.recorder.stop();
      if (blob.size > 200) {
        this.callbacks.onPipelineStatus?.("transcribing");
        this.callbacks.onInterimPhrase?.(`распознавание ${this.asrPort.name}...`);
        const [text, speakerResult] = await Promise.all([
          this.asrPort.transcribe(blob),
          this.speakerPort.identify(blob),
        ]);
        if (text && text.trim().length > 0) {
          this.callbacks.onPipelineStatus?.("distilling");
          this.callbacks.onFinalPhrase?.(text, speakerResult?.seatNumber);
        }
      }
    } catch (err) {
      this.callbacks.onError?.(
        `Ошибка ${this.asrPort.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      this.recorder.cleanup();
      this.callbacks.onPipelineStatus?.("idle");
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
    void this.processCurrentSegment(true, 0);
  }
}
