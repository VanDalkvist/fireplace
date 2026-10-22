import type { SpeechEnginePort, SpeechEngineCallbacks, SpeechEngineKind } from "./speech-types";
import { StreamRecorder } from "./stream-recorder";
import { transcribeAudioBlob } from "./whisper-client";

export class WhisperSpeechAdapter implements SpeechEnginePort {
  private recorder: StreamRecorder;
  private callbacks: SpeechEngineCallbacks;
  private isListeningActive = false;
  private whisperUrl: string;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private chunkInterval: ReturnType<typeof setInterval> | null = null;

  constructor(callbacks: SpeechEngineCallbacks = {}, whisperUrl = "http://127.0.0.1:8085") {
    this.callbacks = callbacks;
    this.whisperUrl = whisperUrl;
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
      this.processCurrentSegment();
      if (this.isListeningActive) {
        this.armSilenceTimer();
      }
    }, 4500);
  }

  private async processCurrentSegment(overlapMs = 300): Promise<void> {
    if (!this.isListeningActive) return;
    const blob = this.recorder.extractCurrentSegment(overlapMs);
    if (!blob || blob.size === 0) return;

    this.callbacks.onInterimPhrase?.("распознавание whisper...");
    try {
      const text = await transcribeAudioBlob(blob, { url: this.whisperUrl });
      if (text) {
        this.callbacks.onFinalPhrase?.(text);
      }
    } catch (err) {
      this.callbacks.onError?.(
        `Ошибка Whisper ASR: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  public async stop(): Promise<void> {
    if (!this.isListeningActive) return;
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.chunkInterval) clearInterval(this.chunkInterval);

    this.isListeningActive = false;
    this.callbacks.onStatusChange?.(false);

    try {
      const blob = await this.recorder.stop();
      if (blob.size > 200) {
        this.callbacks.onInterimPhrase?.("распознавание whisper...");
        const text = await transcribeAudioBlob(blob, { url: this.whisperUrl });
        if (text) {
          this.callbacks.onFinalPhrase?.(text);
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
    this.processCurrentSegment(0);
    this.armSilenceTimer();
  }
}
