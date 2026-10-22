import { clientLogger } from "@/infrastructure/client-logger";

export class MeetingAudioCapture {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timeData: Float32Array = new Float32Array(256);
  private onEndedCallback: (() => void) | null = null;

  public async capture(ac: AudioContext | null): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) return false;
    this.disconnect();

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      // Disable video rendering instead of hard-stopping track (stopping video track terminates stream in Chromium)
      stream.getVideoTracks().forEach((t) => {
        t.enabled = false;
      });
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        clientLogger.warn("[MeetingAudioCapture] No audio track available in display stream. Select Entire Screen with audio enabled.");
        this.disconnect();
        return false;
      }
      clientLogger.info(`[MeetingAudioCapture] Captured display stream: ${audioTracks.length} audio track(s)`);

      audioTracks.forEach((track) => {
        track.addEventListener?.("ended", () => {
          this.disconnect();
          this.onEndedCallback?.();
        });
      });

      this.stream = stream;
      if (ac) {
        this.source = ac.createMediaStreamSource(stream);
        this.analyser = ac.createAnalyser();
        this.analyser.fftSize = 256;
        this.source.connect(this.analyser);
      }
      return true;
    } catch (err) {
      clientLogger.warn(`[MeetingAudioCapture] capture failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  public onEnded(cb: () => void): void {
    this.onEndedCallback = cb;
  }

  public disconnect(): void {
    if (this.source) {
      try {
        if (typeof this.source.disconnect === "function") {
          this.source.disconnect();
        }
      } catch (err) {
        console.warn("[MeetingAudioCapture] source disconnect error:", err);
      }
      this.source = null;
    }
    if (this.analyser) {
      try {
        if (typeof this.analyser.disconnect === "function") {
          this.analyser.disconnect();
        }
      } catch (err) {
        console.warn("[MeetingAudioCapture] analyser disconnect error:", err);
      }
      this.analyser = null;
    }
    if (this.stream) {
      this.stream.getAudioTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  public get isConnected(): boolean {
    return Boolean(this.stream && this.stream.getAudioTracks().some((t) => t.readyState === "live"));
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public getRmsLevel(): number {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.timeData as Float32Array<ArrayBuffer>);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sum += this.timeData[i] * this.timeData[i];
    }
    return Math.sqrt(sum / this.timeData.length);
  }
}
