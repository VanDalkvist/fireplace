import type { SpeechEnginePort, SpeechEngineCallbacks, SpeechEngineKind } from "./speech-types";
import { StreamRecorder } from "./stream-recorder";
import { transcribeAudioBlob } from "./whisper-client";
import { SherpaSpeakerAdapter } from "@/speaker/sherpa-speaker-adapter";
import type { SpeakerIdentificationPort } from "@/speaker/speaker-types";
import { clientLogger } from "@/infrastructure/client-logger";

export class WhisperSpeechAdapter implements SpeechEnginePort {
  private recorder: StreamRecorder;
  private callbacks: SpeechEngineCallbacks;
  private isListeningActive = false;
  private whisperUrl: string;
  private speakerPort: SpeakerIdentificationPort;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    callbacks: SpeechEngineCallbacks = {},
    whisperUrl = "http://127.0.0.1:8085",
    speakerPort?: SpeakerIdentificationPort
  ) {
    this.callbacks = callbacks;
    this.whisperUrl = whisperUrl;
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
    return "whisper";
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
      return;
    }

    const blob = await this.recorder.extractCurrentSegment();
    if (!blob || blob.size === 0) return;

    this.callbacks.onInterimPhrase?.("распознавание whisper...");
    try {
      const [text, speakerResult] = await Promise.all([
        transcribeAudioBlob(blob, { url: this.whisperUrl }),
        this.speakerPort.identify(blob),
      ]);

      if (text && text.trim().length > 0) {
        this.callbacks.onFinalPhrase?.(text, speakerResult?.seatNumber);
      }
    } catch (err) {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      this.isListeningActive = false;
      this.callbacks.onStatusChange?.(false);
      clientLogger.error("Whisper speech segment processing error", err);
      this.callbacks.onError?.(
        `Ошибка Whisper ASR: ${err instanceof Error ? err.message : String(err)}`
      );
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
        this.callbacks.onInterimPhrase?.("распознавание whisper...");
        const [text, speakerResult] = await Promise.all([
          transcribeAudioBlob(blob, { url: this.whisperUrl }),
          this.speakerPort.identify(blob),
        ]);
        if (text && text.trim().length > 0) {
          this.callbacks.onFinalPhrase?.(text, speakerResult?.seatNumber);
        }
      }
    } catch (err) {
      this.callbacks.onError?.(
        `Ошибка Whisper ASR: ${err instanceof Error ? err.message : String(err)}`
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
