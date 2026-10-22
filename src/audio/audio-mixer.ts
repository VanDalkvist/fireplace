export class AudioStreamMixer {
  private audioContext: AudioContext | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private sourceA: MediaStreamAudioSourceNode | null = null;
  private sourceB: MediaStreamAudioSourceNode | null = null;
  private gainA: GainNode | null = null;
  private gainB: GainNode | null = null;
  private active = false;

  public mix(streamA: MediaStream, streamB: MediaStream, existingContext?: AudioContext | null): MediaStream {
    this.cleanup();

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = existingContext ?? new AudioCtx();
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume().catch(() => {});
    }

    this.destination = this.audioContext.createMediaStreamDestination();

    this.sourceA = this.audioContext.createMediaStreamSource(streamA);
    this.gainA = this.audioContext.createGain();
    this.gainA.gain.value = 1.0;
    this.sourceA.connect(this.gainA).connect(this.destination);

    this.sourceB = this.audioContext.createMediaStreamSource(streamB);
    this.gainB = this.audioContext.createGain();
    this.gainB.gain.value = 1.0;
    this.sourceB.connect(this.gainB).connect(this.destination);

    this.active = true;
    return this.destination.stream;
  }

  public isMixing(): boolean {
    return this.active;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public cleanup(): void {
    try { this.sourceA?.disconnect(); } catch { /* ignore */ }
    try { this.sourceB?.disconnect(); } catch { /* ignore */ }
    try { this.gainA?.disconnect(); } catch { /* ignore */ }
    try { this.gainB?.disconnect(); } catch { /* ignore */ }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
    }

    this.sourceA = null;
    this.sourceB = null;
    this.gainA = null;
    this.gainB = null;
    this.destination = null;
    this.audioContext = null;
    this.active = false;
  }
}
