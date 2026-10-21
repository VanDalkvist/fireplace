export interface StreamRecorderOptions {
  mimeType?: string;
}

export class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private resolveStop: ((blob: Blob) => void) | null = null;
  private activeStream: MediaStream | null = null;

  public async start(stream?: MediaStream): Promise<void> {
    if (this.isRecording) return;
    this.chunks = [];

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
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      const type = this.mediaRecorder?.mimeType || "audio/webm";
      const blob = new Blob(this.chunks, { type });
      this.resolveStop?.(blob);
      this.resolveStop = null;
    };

    this.mediaRecorder.start();
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
    this.chunks = [];
  }
}
