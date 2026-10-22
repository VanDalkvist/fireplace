export interface StreamRecorderOptions {
  mimeType?: string;
  maxBufferChunks?: number;
}

export interface TimestampedChunk {
  blob: Blob;
  timestamp: number;
}

export class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private ringBuffer: TimestampedChunk[] = [];
  private readonly maxBufferSize = 240; // Bounded ring buffer (~60s at 250ms chunks)
  private resolveStop: ((blob: Blob) => void) | null = null;
  private activeStream: MediaStream | null = null;

  public async start(stream?: MediaStream, timesliceMs?: number): Promise<void> {
    if (this.isRecording) return;
    this.ringBuffer = [];

    let targetStream = stream;
    if (!targetStream && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      targetStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    if (!targetStream) {
      throw new Error("No audio stream available for recording");
    }

    this.activeStream = targetStream;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : undefined;

    this.mediaRecorder = new MediaRecorder(targetStream, mimeType ? { mimeType } : undefined);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.ringBuffer.push({ blob: e.data, timestamp: Date.now() });
        if (this.ringBuffer.length > this.maxBufferSize) {
          this.ringBuffer.shift(); // Enforce circular bound (AP-018, AP-023)
        }
      }
    };

    this.mediaRecorder.onstop = () => {
      const type = this.mediaRecorder?.mimeType || "audio/webm";
      const blob = new Blob(this.ringBuffer.map((c) => c.blob), { type });
      this.resolveStop?.(blob);
      this.resolveStop = null;
    };

    if (timesliceMs !== undefined) {
      this.mediaRecorder.start(timesliceMs);
    } else {
      this.mediaRecorder.start();
    }
  }

  public extractCurrentSegment(overlapMs = 300): Blob {
    const type = this.mediaRecorder?.mimeType || "audio/webm";
    if (this.ringBuffer.length === 0) {
      return new Blob([], { type });
    }

    const allBlobs = this.ringBuffer.map((c) => c.blob);
    const segmentBlob = new Blob(allBlobs, { type });

    if (overlapMs > 0 && this.ringBuffer.length > 1) {
      // Retain last chunk for seamless overlap windowing (AP-018 Zero Gap)
      const lastChunk = this.ringBuffer[this.ringBuffer.length - 1];
      this.ringBuffer = [lastChunk];
    } else {
      this.ringBuffer = [];
    }

    return segmentBlob;
  }

  public async stop(): Promise<Blob> {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      return new Blob([], { type: "audio/webm" });
    }

    return new Promise<Blob>((resolve) => {
      this.resolveStop = resolve;
      this.mediaRecorder?.stop();
    });
  }

  public get isRecording(): boolean {
    return Boolean(this.mediaRecorder && this.mediaRecorder.state === "recording");
  }

  public cleanup(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((t) => t.stop());
      this.activeStream = null;
    }
    this.mediaRecorder = null;
    this.ringBuffer = [];
  }
}
