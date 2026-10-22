import { EnergyVad } from "./vad/energy-vad";
import type { VoiceActivityDetectorPort } from "./vad/vad-types";

export interface StreamRecorderOptions { mimeType?: string; maxBufferChunks?: number; vad?: VoiceActivityDetectorPort; }
export interface TimestampedChunk { blob: Blob; timestamp: number; }
export interface RecorderVadCallbacks { onSpeechStart?: () => void; onSpeechEnd?: () => void; onAudioLevel?: (rms: number) => void; }

export class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private ringBuffer: TimestampedChunk[] = [];
  private readonly maxBufferSize = 240; // ~60s circular bound (AP-018)
  private resolveStop: ((blob: Blob) => void) | null = null;
  private activeStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private meetingSource: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private rmsInterval: ReturnType<typeof setInterval> | null = null;
  private ownsActiveStream = false;

  private vad: VoiceActivityDetectorPort;
  private vadCallbacks: RecorderVadCallbacks = {};
  private wasSpeaking = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private hasSpeechInSegment = false;
  private lastSpeechTimestamp = 0;

  constructor(options: StreamRecorderOptions = {}) {
    this.vad = options.vad ?? new EnergyVad({ thresholdRatio: 2.5, hangoverFrames: 8 });
  }

  public setVadCallbacks(callbacks: RecorderVadCallbacks): void {
    this.vadCallbacks = callbacks;
  }

  public async start(
    stream?: MediaStream,
    meetingStreamOrTimeslice?: MediaStream | number,
    timesliceMs = 250
  ): Promise<void> {
    if (this.isRecording) return;
    this.ringBuffer = [];
    this.hasSpeechInSegment = false;
    this.wasSpeaking = false;
    this.vad.reset();

    const meetingStream = typeof meetingStreamOrTimeslice === "object" ? meetingStreamOrTimeslice : undefined;
    const resolvedTimeslice = typeof meetingStreamOrTimeslice === "number" ? meetingStreamOrTimeslice : timesliceMs;

    let targetStream = stream;
    if (stream) {
      this.ownsActiveStream = false;
    } else if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        targetStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
        });
      } catch {
        targetStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      this.ownsActiveStream = true;
    }

    if (!targetStream) throw new Error("No audio stream available for recording");

    this.activeStream = targetStream;
    const recordStream = this.setupAudioAnalysis(targetStream, meetingStream);
    this.createMediaRecorder(recordStream, resolvedTimeslice);
  }

  private createMediaRecorder(stream: MediaStream, timesliceMs?: number): void {
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : undefined;

    this.mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.ringBuffer.push({ blob: e.data, timestamp: Date.now() });
        const inSilence = !this.wasSpeaking && !this.hasSpeechInSegment;
        if (inSilence && this.ringBuffer.length > 2) {
          this.ringBuffer.shift(); // Bound memory to 500ms pre-roll in silence (AP-018)
        } else if (this.ringBuffer.length > this.maxBufferSize) {
          this.ringBuffer.shift();
        }
      }
    };
    this.mediaRecorder.onstop = () => {
      const type = this.mediaRecorder?.mimeType || "audio/webm";
      const blob = new Blob(this.ringBuffer.map((c) => c.blob), { type });
      this.resolveStop?.(blob);
      this.resolveStop = null;
    };

    if (timesliceMs !== undefined) this.mediaRecorder.start(timesliceMs);
    else this.mediaRecorder.start();
  }

  private setupAudioAnalysis(stream: MediaStream, meetingStream?: MediaStream): MediaStream {
    if (typeof window === "undefined") return stream;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return stream;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") void this.audioContext.resume().catch(() => {});
      this.audioSource = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.audioSource.connect(this.analyser);

      if (this.rmsInterval) clearInterval(this.rmsInterval);
      this.rmsInterval = setInterval(() => this.processAudioFrame(), 50);

      if (meetingStream) {
        this.meetingSource = this.audioContext.createMediaStreamSource(meetingStream);
        this.meetingSource.connect(this.analyser);
        const dest = this.audioContext.createMediaStreamDestination();
        this.audioSource.connect(dest);
        this.meetingSource.connect(dest);
        return dest.stream;
      }
      return stream;
    } catch (err) {
      console.warn("[StreamRecorder] setupAudioAnalysis non-blocking error:", err);
      return stream;
    }
  }

  private processAudioFrame(): void {
    if (!this.analyser) return;
    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);
    const vadRes = this.vad.process(buffer);

    this.vadCallbacks.onAudioLevel?.(vadRes.energy);

    if (vadRes.isSpeaking) {
      this.hasSpeechInSegment = true;
      this.lastSpeechTimestamp = Date.now();
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      if (!this.wasSpeaking) {
        this.wasSpeaking = true;
        this.vadCallbacks.onSpeechStart?.();
      }
    } else if (this.wasSpeaking && !this.silenceTimer) {
      // Natural pause debounce timer (700ms) before declaring SpeechEnd (AP-012)
      this.silenceTimer = setTimeout(() => {
        this.wasSpeaking = false;
        this.silenceTimer = null;
        this.vadCallbacks.onSpeechEnd?.();
      }, 700);
    }
  }

  public simulateVadSpeechFrame(speaking: boolean, silenceDurationMs = 0): void {
    if (speaking) {
      this.hasSpeechInSegment = true;
      this.wasSpeaking = true;
      this.vadCallbacks.onSpeechStart?.();
    } else if (silenceDurationMs >= 700) {
      this.wasSpeaking = false;
      this.vadCallbacks.onSpeechEnd?.();
    }
  }

  public setMockVoiceActivityForTesting(val: boolean): void { this.hasSpeechInSegment = val; }
  public hasSpeechInCurrentSegment(): boolean { return this.hasSpeechInSegment; }
  public getRingBufferSize(): number { return this.ringBuffer.length; }
  public getLastSpeechTimestamp(): number { return this.lastSpeechTimestamp; }
  public async extractCurrentSegment(): Promise<Blob> { return this.extractSegmentWithContext(0); }

  public async extractSegmentWithContext(_leftContextMs?: number): Promise<Blob> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording" || this.ringBuffer.length === 0) {
      this.hasSpeechInSegment = false;
      return new Blob([], { type: "audio/webm" });
    }

    const segmentBlob = await new Promise<Blob>((resolve) => {
      this.resolveStop = resolve;
      try { this.mediaRecorder?.stop(); } catch { resolve(new Blob([], { type: "audio/webm" })); }
    });

    this.hasSpeechInSegment = false;

    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder = null;
    }

    // Always reset ringBuffer on each extraction so WebM containers stay 100% valid (AP-013, fixes HTTP 422)
    this.ringBuffer = [];

    if (this.activeStream) this.createMediaRecorder(this.activeStream, 250);
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
    if (this.rmsInterval) clearInterval(this.rmsInterval);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    try { this.audioSource?.disconnect(); } catch { /* ignore */ }
    try { this.meetingSource?.disconnect(); } catch { /* ignore */ }
    try { this.analyser?.disconnect(); } catch { /* ignore */ }
    if (this.audioContext && this.audioContext.state !== "closed") void this.audioContext.close().catch(() => {});
    if (this.activeStream && this.ownsActiveStream) this.activeStream.getTracks().forEach((t) => t.stop());
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      if (this.mediaRecorder.state !== "inactive") try { this.mediaRecorder.stop(); } catch { /* ignore */ }
    }
    this.ringBuffer = [];
    this.mediaRecorder = null;
    this.audioSource = null;
    this.analyser = null;
    this.audioContext = null;
    this.activeStream = null;
    this.hasSpeechInSegment = false;
  }
}
