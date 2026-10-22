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
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speechDetected = false;
  private lastSpeechTime = 0;
  private readonly speechRmsThreshold = 0.015;
  private ownsActiveStream = false;

  public async start(stream?: MediaStream, timesliceMs?: number): Promise<void> {
    if (this.isRecording) return;
    this.ringBuffer = [];
    this.speechDetected = false;
    this.lastSpeechTime = 0;

    let targetStream = stream;
    if (stream) {
      this.ownsActiveStream = false;
    } else if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      targetStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.ownsActiveStream = true;
    }

    if (!targetStream) {
      throw new Error("No audio stream available for recording");
    }

    try {
      this.activeStream = targetStream;
      this.setupAudioAnalysis(targetStream);
      this.createMediaRecorder(targetStream, timesliceMs);
    } catch (err) {
      this.cleanup();
      throw err;
    }
  }

  private createMediaRecorder(stream: MediaStream, timesliceMs?: number): void {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : undefined;

    this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.sampleAudioRms();
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

  private setupAudioAnalysis(stream: MediaStream): void {
    if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    } catch (err) {
      console.warn("[StreamRecorder] setupAudioAnalysis failed (non-blocking):", err);
    }
  }

  public getInstantRms(): number {
    if (!this.analyser) return 0;
    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  private sampleAudioRms(): void {
    const rms = this.getInstantRms();
    if (rms >= this.speechRmsThreshold) {
      this.speechDetected = true;
      this.lastSpeechTime = Date.now();
    }
  }

  public hasSpeechInCurrentSegment(): boolean {
    return this.speechDetected;
  }

  public getLastSpeechTimestamp(): number {
    return this.lastSpeechTime;
  }

  public setMockVoiceActivityForTesting(val: boolean): void {
    this.speechDetected = val;
    if (val) this.lastSpeechTime = Date.now();
  }

  public async extractCurrentSegment(): Promise<Blob> {
    this.speechDetected = false;

    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") {
      return new Blob([], { type: "audio/webm" });
    }

    if (this.ringBuffer.length === 0) {
      return new Blob([], { type: "audio/webm" });
    }

    // Stop current recorder to finalize complete, valid WebM container with full EBML header (AP-012)
    const segmentBlob = await new Promise<Blob>((resolve) => {
      this.resolveStop = resolve;
      try {
        this.mediaRecorder?.stop();
      } catch (err) {
        console.warn("[StreamRecorder] stop failed:", err);
        resolve(new Blob([], { type: "audio/webm" }));
      }
    });

    // Reset buffer and restart a fresh MediaRecorder instance on the continuous stream
    this.ringBuffer = [];
    if (this.activeStream) {
      this.createMediaRecorder(this.activeStream, 250);
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
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch((err) => {
        console.warn("[StreamRecorder] AudioContext close failed:", err);
      });
      this.audioContext = null;
    }
    this.analyser = null;
    if (this.activeStream) {
      if (this.ownsActiveStream) {
        this.activeStream.getTracks().forEach((t) => t.stop());
      }
      this.activeStream = null;
    }
    this.mediaRecorder = null;
    this.ringBuffer = [];
    this.speechDetected = false;
  }
}
